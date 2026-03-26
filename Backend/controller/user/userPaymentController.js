const crypto = require("crypto");
const mongoose = require("mongoose");
const Payment = require("../../models/paymentModel");
const Booking = require("../../models/bookingModel");
const Ticket = require("../../models/ticketModel");
const catchAsync = require("../../utils/catchAsync");
const {
  emitTripSeatSnapshot,
  releaseSeatsForBooking
} = require("../../utils/seatLockService");
const { syncTicketStatuses } = require("../../utils/ticketHelpers");

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_FORM_URL =
  process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_STATUS_URL =
  process.env.ESEWA_STATUS_URL ||
  "https://rc.esewa.com.np/api/epay/transaction/status/";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

const getBookingWithAuth = async (bookingId, req) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;

  if (!isOwnerOrAdmin(booking.userId, req.user)) {
    return "FORBIDDEN";
  }

  return booking;
};

const getPaymentAndBooking = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) return null;

  const booking = await Booking.findById(payment.bookingId);
  return { payment, booking };
};

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

const buildEsewaUrls = (booking, payment) => {
  const baseQuery = `bookingId=${booking._id}&paymentId=${payment._id}&tripId=${booking.tripId}`;

  return {
    success_url: `${CLIENT_URL}/booking/${booking._id}/tickets?payment=success&${baseQuery}`,
    failure_url: `${CLIENT_URL}/booking/${booking._id}/details?payment=failure&${baseQuery}`
  };
};

const markBookingConfirmed = async (booking, payment, gatewayRef) => {
  if (payment.paymentStatus !== "paid") {
    payment.paymentStatus = "paid";
    payment.paidAt = new Date();
  }

  if (gatewayRef) {
    payment.transactionId = gatewayRef;
  }

  booking.bookingStatus = "confirmed";
  booking.holdExpiresAt = null;

  await payment.save();
  await booking.save();
  await syncTicketStatuses(booking._id, "confirmed");
  await emitTripSeatSnapshot(booking.tripId);
};

const markBookingFailed = async (booking, payment) => {
  payment.paymentStatus = "failed";
  payment.paidAt = null;
  await payment.save();

  await releaseSeatsForBooking(booking, "failed");
};

exports.createPayment = catchAsync(async (req, res) => {
  const bookingId = req.params.bookId || req.body.bookingId;
  const { amount, method } = req.body;

  if (!bookingId || amount == null) {
    return res.status(400).json({
      success: false,
      message: "bookingId and amount are required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid bookingId" });
  }

  const booking = await getBookingWithAuth(bookingId, req);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (booking === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (booking.bookingStatus === "confirmed") {
    return res.status(400).json({
      success: false,
      message: "This booking has already been paid"
    });
  }

  if (booking.bookingStatus !== "details_completed") {
    return res.status(400).json({
      success: false,
      message: "Complete passenger details for every ticket before payment"
    });
  }

  if (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) <= new Date()) {
    await releaseSeatsForBooking(booking, "expired");
    return res.status(409).json({
      success: false,
      message: "Seat hold expired. Please select seats again."
    });
  }

  const ticketCount = await Ticket.countDocuments({ bookingId });
  if (ticketCount !== booking.seatCount) {
    return res.status(400).json({
      success: false,
      message: "Please complete all passenger ticket forms before payment"
    });
  }

  const transactionUuid = `BRS-${booking._id}-${Date.now()}`;
  const totalAmount = Number(amount);
  const signature = signEsewaFields({
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: ESEWA_PRODUCT_CODE
  });

  let payment = await Payment.findOne({ bookingId });

  if (payment) {
    payment.amount = totalAmount;
    payment.method = method || "esewa";
    payment.transactionId = transactionUuid;
    payment.paymentStatus = "pending";
    payment.paidAt = null;
    await payment.save();
  } else {
    payment = await Payment.create({
      bookingId,
      amount: totalAmount,
      method: method || "esewa",
      transactionId: transactionUuid,
      paymentStatus: "pending",
      paidAt: null
    });
  }

  const esewaUrls = buildEsewaUrls(booking, payment);

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
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (payment.paymentStatus === "paid" && booking.bookingStatus === "confirmed") {
    return res.status(200).json({
      success: true,
      message: "Payment already verified",
      data: payment
    });
  }

  const esewaPayload = decodeEsewaPayload(req.body.data || req.query.data);
  const hasValidResponseSignature = esewaPayload
    ? verifyEsewaResponseSignature(esewaPayload)
    : false;

  const transactionUuid = esewaPayload?.transaction_uuid || payment.transactionId;
  const totalAmount = esewaPayload?.total_amount || payment.amount;
  const productCode = esewaPayload?.product_code || ESEWA_PRODUCT_CODE;

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
  const statusData = await response.json();
  const paymentStatus = statusData?.status;

  if (paymentStatus === "COMPLETE" && (!esewaPayload || hasValidResponseSignature)) {
    await markBookingConfirmed(booking, payment, statusData.ref_id || esewaPayload?.transaction_code);

    return res.status(200).json({
      success: true,
      message: "Payment verified and booking confirmed",
      data: payment,
      verification: statusData
    });
  }

  if (["CANCELED", "NOT_FOUND", "AMBIGUOUS"].includes(paymentStatus) || req.query.payment === "failure") {
    await markBookingFailed(booking, payment);

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
  const payments = await Payment.find().populate({
    path: "bookingId",
    populate: { path: "userId" }
  });

  const filteredPayments =
    req.user.role === "admin"
      ? payments
      : payments.filter((payment) => {
          const booking = payment.bookingId;
          return booking && booking.userId && booking.userId._id.toString() === req.user.id;
        });

  res.status(200).json({
    success: true,
    results: filteredPayments.length,
    data: filteredPayments
  });
});

exports.getSinglePayment = catchAsync(async (req, res) => {
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const populatedPayment = await Payment.findById(payment._id).populate("bookingId");
  res.status(200).json({ success: true, data: populatedPayment });
});

exports.updatePayment = catchAsync(async (req, res) => {
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { amount, method, transactionId, paymentStatus } = req.body;

  if (amount != null) payment.amount = amount;
  if (method) payment.method = method;
  if (transactionId) payment.transactionId = transactionId;

  if (paymentStatus === "paid") {
    await markBookingConfirmed(booking, payment, transactionId);
  } else if (paymentStatus === "failed") {
    await markBookingFailed(booking, payment);
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
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await Payment.findByIdAndDelete(payment._id);
  res.status(200).json({ success: true, message: "Payment deleted successfully" });
});

exports.markPaymentPaid = catchAsync(async (req, res) => {
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await markBookingConfirmed(booking, payment, req.body.transactionId);

  res.status(200).json({
    success: true,
    message: "Payment marked as paid and booking confirmed",
    data: payment
  });
});

exports.markPaymentFailed = catchAsync(async (req, res) => {
  const paymentWithBooking = await getPaymentAndBooking(req.params.id);

  if (!paymentWithBooking) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const { payment, booking } = paymentWithBooking;
  if (!booking || !isOwnerOrAdmin(booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await markBookingFailed(booking, payment);

  res.status(200).json({
    success: true,
    message: "Payment failed, booking reverted, seats freed",
    data: payment
  });
});
