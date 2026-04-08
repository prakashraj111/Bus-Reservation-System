const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\-\s]{7,15}$/;
export const BUS_TYPES = ["ac", "nonac", "mini", "luxury", "tourist"];
export const GENDERS = ["male", "female", "other"];

export const sanitizeText = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const usernameStartsWithNumber = (value) => /^\d/.test(value);
const containsNumber = (value) => /\d/.test(value);
const digitsOnly = (value) => /^\d+$/.test(String(value ?? "").trim());

const isIntegerInRange = (value, min, max) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
};

const isFutureOrToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

export const validateRegisterForm = ({ username, email, password }) => {
  const normalizedUsername = sanitizeText(username);
  const normalizedEmail = sanitizeText(email).toLowerCase();
  const normalizedPassword = typeof password === "string" ? password : "";

  if (normalizedUsername.length < 3 || normalizedUsername.length > 60) {
    return "Full name must be between 3 and 60 characters.";
  }
  if (usernameStartsWithNumber(normalizedUsername)) {
    return "Username cannot start with a number.";
  }
  if (!emailRegex.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }
  if (normalizedPassword.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  return "";
};

export const validateLoginForm = ({ email, password }) => {
  const normalizedEmail = sanitizeText(email).toLowerCase();
  const normalizedPassword = typeof password === "string" ? password : "";
  if (!emailRegex.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }
  if (normalizedPassword.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  return "";
};

export const validateBusForm = ({ busName, description, operator, busNumberPlate, type, totalSeats }) => {
  const normalizedBusName = sanitizeText(busName);
  const normalizedDescription = sanitizeText(description);
  const normalizedOperator = sanitizeText(operator);
  const normalizedBusNumberPlate = String(busNumberPlate ?? "").trim();

  if (normalizedBusName.length < 2 || normalizedBusName.length > 60) {
    return "Bus name must be between 2 and 60 characters.";
  }
  if (containsNumber(normalizedBusName)) {
    return "Bus name cannot contain numbers.";
  }
  if (normalizedDescription.length < 10 || normalizedDescription.length > 500) {
    return "Description must be between 10 and 500 characters.";
  }
  if (containsNumber(normalizedDescription)) {
    return "Description cannot contain numbers.";
  }
  if (normalizedOperator.length < 2 || normalizedOperator.length > 60) {
    return "Operator name must be between 2 and 60 characters.";
  }
  if (containsNumber(normalizedOperator)) {
    return "Operator name cannot contain numbers.";
  }
  if (!digitsOnly(normalizedBusNumberPlate)) {
    return "Bus number plate must contain numbers only.";
  }
  if (!isIntegerInRange(normalizedBusNumberPlate, 1, 999999999999)) {
    return "Bus number plate must be a positive whole number.";
  }
  if (!BUS_TYPES.includes(type)) {
    return "Please choose a valid bus type.";
  }
  if (!isIntegerInRange(totalSeats, 40, 60)) {
    return "Total seats must be a whole number between 40 and 60.";
  }
  return "";
};

export const validateRouteForm = ({ from, to, distanceKm, estimatedDurationMin, stops }) => {
  const fromName = sanitizeText(from?.stopName);
  const toName = sanitizeText(to?.stopName);
  if (!fromName || !toName) {
    return "Both departure and destination stops are required.";
  }
  if (fromName.toLowerCase() === toName.toLowerCase()) {
    return "Departure and destination must be different.";
  }
  if (!from?.departureTime) {
    return "Departure time is required.";
  }
  if (!to?.arrivalTime) {
    return "Arrival time is required.";
  }
  if (from.departureTime === to.arrivalTime) {
    return "Arrival time must be different from departure time.";
  }
  if (Number(distanceKm) < 0) {
    return "Distance cannot be negative.";
  }
  if (!isIntegerInRange(estimatedDurationMin, 1, 100000)) {
    return "Estimated duration must be at least 1 minute.";
  }

  const names = new Set([fromName.toLowerCase(), toName.toLowerCase()]);
  for (const stop of stops || []) {
    const stopName = sanitizeText(stop.stopName);
    if (!stopName && !stop.arrivalTime && !stop.departureTime) {
      continue;
    }
    if (!stopName) {
      return "Each intermediate stop must include a stop name.";
    }
    if (!stop.arrivalTime) {
      return `Arrival time is required for stop "${stopName}".`;
    }
    if (names.has(stopName.toLowerCase())) {
      return "All route stops must be unique.";
    }
    names.add(stopName.toLowerCase());
  }

  return "";
};

export const validateTripForm = ({ travelDate, departureTime, arrivalTime, seatPrice, totalSeats }) => {
  if (!isFutureOrToday(travelDate)) {
    return "Travel date must be today or later.";
  }
  if (!departureTime || !arrivalTime) {
    return "Departure and arrival times are required.";
  }
  if (departureTime === arrivalTime) {
    return "Arrival time must be different from departure time.";
  }
  if (Number(seatPrice) <= 0) {
    return "Seat price must be greater than 0.";
  }
  if (!isIntegerInRange(totalSeats, 40, 60)) {
    return "Total seats must be a whole number between 40 and 60.";
  }
  return "";
};

export const validateReviewForm = ({ comment, rating }) => {
  const normalizedComment = sanitizeText(comment);
  if (normalizedComment.length < 5 || normalizedComment.length > 500) {
    return "Review must be between 5 and 500 characters.";
  }
  if (!isIntegerInRange(rating, 1, 5)) {
    return "Rating must be between 1 and 5.";
  }
  return "";
};

export const validateSearchForm = ({ from, to, travelDate }) => {
  const normalizedFrom = sanitizeText(from);
  const normalizedTo = sanitizeText(to);
  if (!normalizedFrom || !normalizedTo || !travelDate) {
    return "Enter from, to, and travel date to search.";
  }
  if (normalizedFrom.toLowerCase() === normalizedTo.toLowerCase()) {
    return "From and to locations must be different.";
  }
  if (!isFutureOrToday(travelDate)) {
    return "Travel date must be today or later.";
  }
  return "";
};

export const validatePassengerForms = (forms) => {
  for (const form of forms || []) {
    if (sanitizeText(form.passengerName).length < 2 || sanitizeText(form.passengerName).length > 60) {
      return `Passenger name is invalid for seat ${form.seatLabel}.`;
    }
    if (!isIntegerInRange(form.passengerAge, 1, 120)) {
      return `Passenger age must be between 1 and 120 for seat ${form.seatLabel}.`;
    }
    if (!GENDERS.includes(form.passengerGender)) {
      return `Passenger gender is invalid for seat ${form.seatLabel}.`;
    }
    if (!phoneRegex.test(sanitizeText(form.passengerPhone))) {
      return `Phone number is invalid for seat ${form.seatLabel}.`;
    }
    if (!sanitizeText(form.boardingPoint) || !sanitizeText(form.droppingPoint)) {
      return `Boarding and dropping points are required for seat ${form.seatLabel}.`;
    }
    if (sanitizeText(form.boardingPoint).toLowerCase() === sanitizeText(form.droppingPoint).toLowerCase()) {
      return `Boarding and dropping points must be different for seat ${form.seatLabel}.`;
    }
  }
  return "";
};
