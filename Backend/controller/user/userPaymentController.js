const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("../../models/bookingModel");
const Payment = require("../../models/paymentModel");
const SeatLock = require("../../models/seatLockModel");
const Ticket = require("../../models/ticketModel");
const catchAsync = require("../../utils/catchAsync");
const { emitTripSeatSnapshot, releaseSeatsForSeatLock } = require("../../utils/seatLockService");
const { buildTripSnapshot, generateTicketNumber, getSeatLabel } = require("../../utils/ticketHelpers");
const { isValidObjectId, validatePaymentPayload } = require("../../utils/validation");

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_FORM_URL =
  process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_STATUS_URL =
  process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

const getSeatLockWithAuth = async (seatLockId, req) => {
  const seatLock = await SeatLock.findById(seatLockId).populate({
    path: "tripId",
    populate: [{ path: "busId" }, { path: "routeId" }]
  });

  if (!seatLock) return null;

  if (!isOwnerOrAdmin(seatLock.userId, req.user)) {
    return "FORBIDDEN";
  }

  return seatLock;
};

const getPaymentContext = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) return null;

  const seatLock = await SeatLock.findById(payment.seatLockId).populate({
    path: "tripId",
    populate: [{ path: "busId" }, { path: "routeId" }]
  });
  const booking = payment.bookingId ? await Booking.findById(payment.bookingId) : null;

  return { payment, seatLock, booking };
};

const getPaymentPopulateQuery = () =>
  Payment.find()
    .populate({
      path: "seatLockId",
      populate: {
        path: "tripId",
        populate: { path: "routeId" }
      }
    })
    .populate("bookingId");

const signEsewaFields = ({ total_amount, transaction_uuid, product_code }) => {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;

  return crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
};

const verifyEsewaResponseSignature = (payload) => {
  if (!payload?.signature || !payload?.signed_field_names) return false;

  const fieldNames = payload.signed_field_names.split(",");
  const message = fieldNames
    .map((field) => `${field}=${payload[field] ?? ""}`)
    .join(",");

  const expectedSignature = crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  return expectedSignature === payload.signature;
};

const decodeEsewaPayload = (encodedPayload) => {
  if (!encodedPayload) return null;

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf-8"));
  } catch {
    return null;
  }
};

const buildEsewaUrls = (seatLock, payment) => {
  return {
    success_url: `${CLIENT_URL}/seat-lock/${seatLock._id}/details/esewa/success?paymentId=${payment._id}`,
    failure_url: `${CLIENT_URL}/seat-lock/${seatLock._id}/details/esewa/failure?paymentId=${payment._id}`
  };
};

const getPaymentContextForVerification = async ({ paymentId, seatLockId, transactionUuid }) => {
  let payment = null;

  if (paymentId) {
    payment = await Payment.findById(paymentId);
  } else if (seatLockId) {
    const paymentQuery = { seatLockId };

    if (transactionUuid) {
      paymentQuery.transactionId = transactionUuid;
    }

    payment = await Payment.findOne(paymentQuery).sort({ createdAt: -1 });

    if (!payment && transactionUuid) {
      payment = await Payment.findOne({ seatLockId }).sort({ createdAt: -1 });
    }
  }

  if (!payment) return null;

  const seatLock = await SeatLock.findById(payment.seatLockId).populate({
    path: "tripId",
    populate: [{ path: "busId" }, { path: "routeId" }]
  });
  const booking = payment.bookingId ? await Booking.findById(payment.bookingId) : null;

  return { payment, seatLock, booking };
};

const createConfirmedBookingFromSeatLock = async (seatLock, payment, gatewayRef) => {
  let booking = payment.bookingId ? await Booking.findById(payment.bookingId) : null;

  if (!booking) {
    const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

    booking = await Booking.create({
      userId: seatLock.userId,
      tripId: seatLock.tripId._id || seatLock.tripId,
      bookingCode,
      seatCount: seatLock.seatCount,
      seatNumbers: seatLock.seatNumbers,
      totalAmount: seatLock.totalAmount,
      bookingStatus: "confirmed",
      detailsCompletedAt: seatLock.detailsCompletedAt,
      holdExpiresAt: null
    });

    const snapshot = buildTripSnapshot(seatLock.tripId);

    await Ticket.insertMany(
      seatLock.passengerDetails.map((detail) => ({
        bookingId: booking._id,
        tripId: seatLock.tripId._id || seatLock.tripId,
        userId: seatLock.userId,
        seatNumber: detail.seatNumber,
        seatLabel: detail.seatLabel || getSeatLabel(detail.seatNumber),
        ticketNumber: generateTicketNumber(),
        passengerName: detail.passengerName,
        passengerAge: detail.passengerAge,
        passengerGender: detail.passengerGender,
        passengerPhone: detail.passengerPhone,
        boardingPoint: detail.boardingPoint,
        droppingPoint: detail.droppingPoint,
        ticketStatus: "confirmed",
        issuedAt: new Date(),
        snapshot
      }))
    );
  }

  payment.bookingId = booking._id;
  payment.paymentStatus = "paid";
  payment.paidAt = new Date();
  if (gatewayRef) {
    payment.transactionId = gatewayRef;
  }

  seatLock.lockStatus = "paid";
  seatLock.holdExpiresAt = null;

  await payment.save();
  await seatLock.save();
  await emitTripSeatSnapshot(seatLock.tripId._id || seatLock.tripId);

  return booking;
};

const markPaymentFailed = async (seatLock, payment) => {
  payment.paymentStatus = "failed";
  payment.paidAt = null;
  await payment.save();

  await releaseSeatsForSeatLock(seatLock, "failed");
};

exports.createPayment = catchAsync(async (req, res) => {
  const seatLockId = req.params.seatLockId || req.body.seatLockId;

  if (!seatLockId || !mongoose.Types.ObjectId.isValid(seatLockId)) {
    return res.status(400).json({ success: false, message: "Invalid seatLockId" });
  }

  const seatLock = await getSeatLockWithAuth(seatLockId, req);
  if (!seatLock) {
    return res.status(404).json({ success: false, message: "Seat lock not found" });
  }
  if (seatLock === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (seatLock.lockStatus === "paid") {
    return res.status(400).json({
      success: false,
      message: "This seat lock has already been paid"
    });
  }

  if (seatLock.lockStatus !== "details_completed") {
    return res.status(400).json({
      success: false,
      message: "Complete passenger details for every ticket before payment"
    });
  }

  if (!seatLock.holdExpiresAt || new Date(seatLock.holdExpiresAt) <= new Date()) {
    await releaseSeatsForSeatLock(seatLock, "expired");
    return res.status(409).json({
      success: false,
      message: "Seat hold expired. Please select seats again."
    });
  }

  if (!Array.isArray(seatLock.passengerDetails) || seatLock.passengerDetails.length !== seatLock.seatCount) {
    return res.status(400).json({
      success: false,
      message: "Please complete all passenger ticket forms before payment"
    });
  }

  const validation = validatePaymentPayload(req.body, seatLock.totalAmount);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { amount, method } = validation.value;

  const transactionUuid = `BRS-${seatLock._id}-${Date.now()}`;
  const totalAmount = amount;
  const signature = signEsewaFields({
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: ESEWA_PRODUCT_CODE
  });

  let payment = await Payment.findOne({ seatLockId });

  if (payment) {
    payment.amount = totalAmount;
    payment.method = method || "esewa";
    payment.transactionId = transactionUuid;
    payment.paymentStatus = "pending";
    payment.paidAt = null;
    await payment.save();
  } else {
    payment = await Payment.create({
      seatLockId,
      amount: totalAmount,
      method: method || "esewa",
      transactionId: transactionUuid,
      paymentStatus: "pending",
      paidAt: null
    });
  }

  seatLock.lockStatus = "payment_initiated";
  await seatLock.save();

  const esewaUrls = buildEsewaUrls(seatLock, payment);

  res.status(201).json({
    success: true,
    message: "eSewa payment created successfully",
    data: payment,
    esewa: {
      action: ESEWA_FORM_URL,
      method: "POST",
      fields: {
        amount: totalAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
        ...esewaUrls
      }
    }
  });
});

exports.verifyEsewaPayment = catchAsync(async (req, res) => {
  const esewaPayload = decodeEsewaPayload(req.body.data || req.query.data);
  const paymentId = req.params.id;

  if (!paymentId || !isValidObjectId(paymentId)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContextForVerification({
    paymentId,
    seatLockId: req.params.seatLockId
  });

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;

  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (payment.paymentStatus === "paid" && payment.bookingId) {
    return res.status(200).json({
      success: true,
      message: "Payment already verified",
      data: payment,
      bookingId: payment.bookingId
    });
  }

  const hasValidResponseSignature = esewaPayload
    ? verifyEsewaResponseSignature(esewaPayload)
    : false;

  const totalAmount = esewaPayload?.total_amount || payment.amount;
  const productCode = esewaPayload?.product_code || ESEWA_PRODUCT_CODE;
  const transactionUuid = esewaPayload?.transaction_uuid || payment.transactionId;

  if (!transactionUuid) {
    return res.status(400).json({
      success: false,
      message: "Missing transaction reference for verification"
    });
  }

  const statusUrl = new URL(ESEWA_STATUS_URL);
  statusUrl.searchParams.set("product_code", productCode);
  statusUrl.searchParams.set("total_amount", totalAmount);
  statusUrl.searchParams.set("transaction_uuid", transactionUuid);

  const response = await fetch(statusUrl.toString());
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    return res.status(response.status).json({
      success: false,
      message: "Unable to verify payment with eSewa",
      verificationError: errorBody || response.statusText || "Unknown eSewa error"
    });
  }

  const statusData = await response.json();
  const paymentStatus = String(statusData?.status || "").trim().toUpperCase();

  if (paymentStatus === "COMPLETE" && (!esewaPayload || hasValidResponseSignature)) {
    const booking = await createConfirmedBookingFromSeatLock(
      seatLock,
      payment,
      statusData.ref_id || statusData.refId || esewaPayload?.transaction_code
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: payment,
      bookingId: booking._id,
      verification: statusData
    });
  }

  if (["CANCELED", "NOT_FOUND", "AMBIGUOUS"].includes(paymentStatus) || req.query.payment === "failure") {
    await markPaymentFailed(seatLock, payment);

    return res.status(200).json({
      success: false,
      message: "Payment was not completed. The seat lock has been released.",
      data: payment,
      verification: statusData
    });
  }

  return res.status(202).json({
    success: false,
    message: "Payment is still pending verification",
    data: payment,
    verification: statusData
  });
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const payments = await getPaymentPopulateQuery();

  const filteredPayments =
    req.user.role === "admin"
      ? payments
      : payments.filter((payment) => {
          const seatLock = payment.seatLockId;
          return seatLock && seatLock.userId && seatLock.userId.toString() === req.user.id;
        });

  res.status(200).json({
    success: true,
    results: filteredPayments.length,
    data: filteredPayments
  });
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const payments = await getPaymentPopulateQuery();

  const myPayments = payments
    .filter((payment) => {
      const seatLock = payment.seatLockId;
      return seatLock && seatLock.userId && seatLock.userId.toString() === req.user.id;
    })
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt));

  res.status(200).json({
    success: true,
    results: myPayments.length,
    data: myPayments
  });
});

exports.getSinglePayment = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContext(req.params.id);

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;
  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const populatedPayment = await Payment.findById(payment._id)
    .populate("seatLockId")
    .populate("bookingId");

  res.status(200).json({ success: true, data: populatedPayment });
});

exports.updatePayment = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContext(req.params.id);

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;
  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { amount, method, transactionId, paymentStatus } = req.body;

  if (amount != null || method != null) {
    const validation = validatePaymentPayload(
      {
        amount: amount ?? payment.amount,
        method: method ?? payment.method
      },
      seatLock.totalAmount
    );

    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    payment.amount = validation.value.amount;
    payment.method = validation.value.method;
  }

  if (transactionId) payment.transactionId = transactionId;

  if (paymentStatus === "paid") {
    const booking = await createConfirmedBookingFromSeatLock(seatLock, payment, transactionId);
    payment.bookingId = booking._id;
  } else if (paymentStatus === "failed") {
    await markPaymentFailed(seatLock, payment);
  } else {
    await payment.save();
  }

  res.status(200).json({
    success: true,
    message: "Payment updated successfully",
    data: payment
  });
});

exports.deletePayment = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContext(req.params.id);

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;
  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await Payment.findByIdAndDelete(payment._id);
  res.status(200).json({ success: true, message: "Payment deleted successfully" });
});

exports.markPaymentPaid = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContext(req.params.id);

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;
  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const booking = await createConfirmedBookingFromSeatLock(seatLock, payment, req.body.transactionId);

  res.status(200).json({
    success: true,
    message: "Payment marked as paid and booking confirmed",
    data: payment,
    bookingId: booking._id
  });
});

exports.markPaymentFailed = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment ID" });
  }

  const context = await getPaymentContext(req.params.id);

  if (!context) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, seatLock } = context;
  if (!seatLock || !isOwnerOrAdmin(seatLock.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await markPaymentFailed(seatLock, payment);

  res.status(200).json({
    success: true,
    message: "Payment failed, seat lock reverted, seats freed",
    data: payment
  });
});
