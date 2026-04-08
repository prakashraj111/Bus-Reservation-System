const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;
const BUS_TYPES = ["ac", "nonac", "mini", "luxury", "tourist"];
const TRIP_STATUSES = ["scheduled", "cancelled", "completed"];
const PAYMENT_METHODS = ["esewa", "khalti"];
const GENDERS = ["male", "female", "other"];

const sanitizeString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const usernameStartsWithNumber = (value) => /^\d/.test(value);
const containsNumber = (value) => /\d/.test(value);
const digitsOnly = (value) => /^\d+$/.test(String(value ?? "").trim());

const normalizeLocation = (value) => sanitizeString(value);

const toPositiveNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const isFutureOrTodayDateString = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const candidate = new Date(parsed);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return candidate >= today;
};

const validateAuthPayload = ({ username, email, password }, { requireUsername = false } = {}) => {
  const normalizedUsername = sanitizeString(username);
  const normalizedEmail = sanitizeString(email).toLowerCase();
  const normalizedPassword = typeof password === "string" ? password : "";

  if (requireUsername) {
    if (!normalizedUsername) return { error: "Full name is required" };
    if (normalizedUsername.length < 3 || normalizedUsername.length > 60) {
      return { error: "Full name must be between 3 and 60 characters" };
    }
    if (usernameStartsWithNumber(normalizedUsername)) {
      return { error: "Username cannot start with a number" };
    }
  }

  if (!normalizedEmail) return { error: "Email is required" };
  if (!EMAIL_REGEX.test(normalizedEmail)) return { error: "Please provide a valid email address" };

  if (!normalizedPassword) return { error: "Password is required" };
  if (normalizedPassword.length < 6) {
    return { error: "Password must be at least 6 characters long" };
  }
  if (normalizedPassword.length > 128) {
    return { error: "Password must be 128 characters or fewer" };
  }

  return {
    value: {
      username: normalizedUsername,
      email: normalizedEmail,
      password: normalizedPassword
    }
  };
};

const validateBusPayload = (payload, { isPartial = false } = {}) => {
  const normalized = {
    busName: sanitizeString(payload.busName),
    description: sanitizeString(payload.description),
    operator: sanitizeString(payload.operator),
    busNumberPlate: String(payload.busNumberPlate ?? "").trim(),
    type: sanitizeString(payload.type).toLowerCase(),
    totalSeats: toPositiveNumber(payload.totalSeats)
  };

  if (!isPartial || payload.busName !== undefined) {
    if (!normalized.busName) return { error: "Bus name is required" };
    if (normalized.busName.length < 2 || normalized.busName.length > 60) {
      return { error: "Bus name must be between 2 and 60 characters" };
    }
    if (containsNumber(normalized.busName)) {
      return { error: "Bus name cannot contain numbers" };
    }
  }

  if (!isPartial || payload.description !== undefined) {
    if (!normalized.description) return { error: "Description is required" };
    if (normalized.description.length < 10 || normalized.description.length > 500) {
      return { error: "Description must be between 10 and 500 characters" };
    }
    if (containsNumber(normalized.description)) {
      return { error: "Description cannot contain numbers" };
    }
  }

  if (!isPartial || payload.operator !== undefined) {
    if (!normalized.operator) return { error: "Operator name is required" };
    if (normalized.operator.length < 2 || normalized.operator.length > 60) {
      return { error: "Operator name must be between 2 and 60 characters" };
    }
    if (containsNumber(normalized.operator)) {
      return { error: "Operator name cannot contain numbers" };
    }
  }

  if (!isPartial || payload.busNumberPlate !== undefined) {
    if (!digitsOnly(normalized.busNumberPlate)) {
      return { error: "Bus number plate must contain numbers only" };
    }
    if (!Number.isInteger(Number(normalized.busNumberPlate)) || Number(normalized.busNumberPlate) <= 0) {
      return { error: "Bus number plate must be a positive whole number" };
    }
  }

  if (!isPartial || payload.type !== undefined) {
    if (!BUS_TYPES.includes(normalized.type)) {
      return { error: "Please select a valid bus type" };
    }
  }

  if (!isPartial || payload.totalSeats !== undefined) {
    if (!Number.isInteger(normalized.totalSeats)) {
      return { error: "Total seats must be a whole number" };
    }
    if (normalized.totalSeats < 40 || normalized.totalSeats > 60) {
      return { error: "Total seats must be between 40 and 60" };
    }
  }

  return { value: normalized };
};

const normalizeStop = (stop) => ({
  stopName: normalizeLocation(stop?.stopName),
  arrivalTime: sanitizeString(stop?.arrivalTime),
  departureTime: sanitizeString(stop?.departureTime)
});

const validateRoutePayload = (payload, { requireBusId = true } = {}) => {
  const normalized = {
    busId: sanitizeString(payload.busId),
    from: normalizeStop(payload.from || {}),
    to: normalizeStop(payload.to || {}),
    distanceKm: payload.distanceKm === "" ? 0 : toPositiveNumber(payload.distanceKm),
    estimatedDurationMin:
      payload.estimatedDurationMin === "" ? 0 : toPositiveNumber(payload.estimatedDurationMin),
    stops: Array.isArray(payload.stops) ? payload.stops.map(normalizeStop) : []
  };

  if (requireBusId) {
    if (!normalized.busId) return { error: "Bus ID is required" };
    if (!isValidObjectId(normalized.busId)) return { error: "Bus ID is invalid" };
  }

  if (!normalized.from.stopName) return { error: "Departure stop name is required" };
  if (!normalized.to.stopName) return { error: "Destination stop name is required" };
  if (normalized.from.stopName.toLowerCase() === normalized.to.stopName.toLowerCase()) {
    return { error: "Departure and destination stops must be different" };
  }

  if (!TIME_REGEX.test(normalized.from.departureTime)) {
    return { error: "Departure time must be in HH:mm format" };
  }
  if (!TIME_REGEX.test(normalized.to.arrivalTime)) {
    return { error: "Arrival time must be in HH:mm format" };
  }

  if (normalized.distanceKm === null || normalized.distanceKm < 0) {
    return { error: "Distance must be zero or more" };
  }

  if (!Number.isInteger(normalized.estimatedDurationMin) || normalized.estimatedDurationMin < 1) {
    return { error: "Estimated duration must be at least 1 minute" };
  }

  const stopNames = new Set([
    normalized.from.stopName.toLowerCase(),
    normalized.to.stopName.toLowerCase()
  ]);

  for (const stop of normalized.stops) {
    if (!stop.stopName && !stop.arrivalTime && !stop.departureTime) continue;
    if (!stop.stopName) return { error: "Every intermediate stop must include a stop name" };
    if (!TIME_REGEX.test(stop.arrivalTime)) {
      return { error: `Arrival time is required for stop "${stop.stopName}"` };
    }
    const key = stop.stopName.toLowerCase();
    if (stopNames.has(key)) {
      return { error: "Route stop names must be unique" };
    }
    stopNames.add(key);
  }

  normalized.stops = normalized.stops.filter((stop) => stop.stopName);

  return { value: normalized };
};

const validateTripPayload = (payload, { isPartial = false } = {}) => {
  const normalized = {
    travelDate: sanitizeString(payload.travelDate),
    departureTime: sanitizeString(payload.departureTime),
    arrivalTime: sanitizeString(payload.arrivalTime),
    seatPrice: toPositiveNumber(payload.seatPrice),
    totalSeats: toPositiveNumber(payload.totalSeats),
    status: sanitizeString(payload.status).toLowerCase()
  };

  if (!isPartial || payload.travelDate !== undefined) {
    if (!normalized.travelDate) return { error: "Travel date is required" };
    if (!isFutureOrTodayDateString(normalized.travelDate)) {
      return { error: "Travel date must be today or later" };
    }
  }

  if (!isPartial || payload.departureTime !== undefined) {
    if (!TIME_REGEX.test(normalized.departureTime)) {
      return { error: "Departure time must be in HH:mm format" };
    }
  }

  if (!isPartial || payload.arrivalTime !== undefined) {
    if (!TIME_REGEX.test(normalized.arrivalTime)) {
      return { error: "Arrival time must be in HH:mm format" };
    }
  }

  if (
    (!isPartial || payload.departureTime !== undefined || payload.arrivalTime !== undefined) &&
    normalized.departureTime &&
    normalized.arrivalTime &&
    normalized.departureTime === normalized.arrivalTime
  ) {
    return { error: "Arrival time must be different from departure time" };
  }

  if (!isPartial || payload.seatPrice !== undefined) {
    if (!Number.isFinite(normalized.seatPrice) || normalized.seatPrice <= 0) {
      return { error: "Seat price must be greater than 0" };
    }
  }

  if (!isPartial || payload.totalSeats !== undefined) {
    if (!Number.isInteger(normalized.totalSeats)) {
      return { error: "Total seats must be a whole number" };
    }
    if (normalized.totalSeats < 40 || normalized.totalSeats > 60) {
      return { error: "Total seats must be between 40 and 60" };
    }
  }

  if (payload.status !== undefined && !TRIP_STATUSES.includes(normalized.status)) {
    return { error: "Trip status is invalid" };
  }

  return { value: normalized };
};

const validateReviewPayload = ({ comment, rating }) => {
  const normalized = {
    comment: sanitizeString(comment),
    rating: Number(rating)
  };

  if (!normalized.comment) return { error: "Review comment is required" };
  if (normalized.comment.length < 5 || normalized.comment.length > 500) {
    return { error: "Review comment must be between 5 and 500 characters" };
  }
  if (!Number.isInteger(normalized.rating) || normalized.rating < 1 || normalized.rating > 5) {
    return { error: "Rating must be a whole number between 1 and 5" };
  }

  return { value: normalized };
};

const validateSearchPayload = ({ from, to, travelDate }) => {
  const normalized = {
    from: normalizeLocation(from),
    to: normalizeLocation(to),
    travelDate: sanitizeString(travelDate)
  };

  if (!normalized.from || !normalized.to || !normalized.travelDate) {
    return { error: "From, to, and travel date are required" };
  }
  if (normalized.from.toLowerCase() === normalized.to.toLowerCase()) {
    return { error: "From and to locations must be different" };
  }
  if (!isFutureOrTodayDateString(normalized.travelDate)) {
    return { error: "Travel date must be today or later" };
  }

  return { value: normalized };
};

const validateSuggestionQuery = (query) => {
  const normalized = normalizeLocation(query);
  if (!normalized) return { error: "Search query is required" };
  if (normalized.length < 2) return { error: "Search query must be at least 2 characters" };
  if (normalized.length > 50) return { error: "Search query must be 50 characters or fewer" };
  return { value: normalized };
};

const validateSeatSelection = ({ seatNumbers, totalAmount }, trip) => {
  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return { error: "Please select at least one seat" };
  }
  if (seatNumbers.length > 5) {
    return { error: "You can select a maximum of 5 seats at once" };
  }

  const numericSeats = seatNumbers.map((seat) => Number(seat));
  if (numericSeats.some((seat) => !Number.isInteger(seat) || seat < 1)) {
    return { error: "Seat numbers must be positive whole numbers" };
  }

  const uniqueSeats = [...new Set(numericSeats)].sort((a, b) => a - b);
  if (uniqueSeats.length !== numericSeats.length) {
    return { error: "Duplicate seat numbers are not allowed" };
  }

  if (trip && uniqueSeats.some((seat) => seat > Number(trip.totalSeats || 0))) {
    return { error: "One or more seat numbers exceed the trip capacity" };
  }

  const numericTotalAmount = Number(totalAmount);
  if (!Number.isFinite(numericTotalAmount) || numericTotalAmount <= 0) {
    return { error: "Total amount must be greater than 0" };
  }

  if (trip) {
    const expectedAmount = uniqueSeats.length * Number(trip.seatPrice || 0);
    if (numericTotalAmount !== expectedAmount) {
      return { error: "Submitted total amount does not match the trip fare" };
    }
  }

  return {
    value: {
      seatNumbers: uniqueSeats,
      totalAmount: numericTotalAmount
    }
  };
};

const normalizePassengerTicket = (ticket) => ({
  seatNumber: Number(ticket?.seatNumber),
  passengerName: sanitizeString(ticket?.passengerName),
  passengerAge: Number(ticket?.passengerAge),
  passengerGender: sanitizeString(ticket?.passengerGender).toLowerCase(),
  passengerPhone: sanitizeString(ticket?.passengerPhone),
  boardingPoint: normalizeLocation(ticket?.boardingPoint),
  droppingPoint: normalizeLocation(ticket?.droppingPoint)
});

const validatePassengerTickets = (tickets, expectedSeatNumbers = []) => {
  if (!Array.isArray(tickets) || !tickets.length) {
    return { error: "Passenger details are required for every selected seat" };
  }

  const normalizedTickets = tickets.map(normalizePassengerTicket);
  const normalizedExpectedSeats = [...expectedSeatNumbers].map(Number).sort((a, b) => a - b);
  const submittedSeats = normalizedTickets.map((ticket) => ticket.seatNumber).sort((a, b) => a - b);

  if (normalizedExpectedSeats.length && JSON.stringify(normalizedExpectedSeats) !== JSON.stringify(submittedSeats)) {
    return { error: "Passenger details must exactly match the selected seats" };
  }

  for (const ticket of normalizedTickets) {
    if (!ticket.passengerName || ticket.passengerName.length < 2 || ticket.passengerName.length > 60) {
      return { error: `Passenger name is invalid for seat ${ticket.seatNumber}` };
    }
    if (!Number.isInteger(ticket.passengerAge) || ticket.passengerAge < 1 || ticket.passengerAge > 120) {
      return { error: `Passenger age must be between 1 and 120 for seat ${ticket.seatNumber}` };
    }
    if (!GENDERS.includes(ticket.passengerGender)) {
      return { error: `Passenger gender is invalid for seat ${ticket.seatNumber}` };
    }
    if (!PHONE_REGEX.test(ticket.passengerPhone)) {
      return { error: `Phone number is invalid for seat ${ticket.seatNumber}` };
    }
    if (!ticket.boardingPoint || !ticket.droppingPoint) {
      return { error: `Boarding and dropping points are required for seat ${ticket.seatNumber}` };
    }
    if (ticket.boardingPoint.toLowerCase() === ticket.droppingPoint.toLowerCase()) {
      return { error: `Boarding and dropping points must be different for seat ${ticket.seatNumber}` };
    }
  }

  return { value: normalizedTickets };
};

const validatePaymentPayload = ({ amount, method }, expectedAmount) => {
  const normalized = {
    amount: Number(amount),
    method: sanitizeString(method || "esewa").toLowerCase()
  };

  if (!Number.isFinite(normalized.amount) || normalized.amount <= 0) {
    return { error: "Payment amount must be greater than 0" };
  }
  if (!PAYMENT_METHODS.includes(normalized.method)) {
    return { error: "Payment method is invalid" };
  }
  if (expectedAmount != null && normalized.amount !== Number(expectedAmount)) {
    return { error: "Payment amount must match the locked seat total" };
  }

  return { value: normalized };
};

module.exports = {
  BUS_TYPES,
  PAYMENT_METHODS,
  TIME_REGEX,
  GENDERS,
  isValidObjectId,
  sanitizeString,
  validateAuthPayload,
  validateBusPayload,
  validateRoutePayload,
  validateTripPayload,
  validateReviewPayload,
  validateSearchPayload,
  validateSuggestionQuery,
  validateSeatSelection,
  validatePassengerTickets,
  validatePaymentPayload
};
