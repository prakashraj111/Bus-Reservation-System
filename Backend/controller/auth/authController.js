const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const catchAsync = require("../../utils/catchAsync");
const { validateAuthPayload } = require("../../utils/validation");

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.SECRET_KEY,
    { expiresIn: "30d" }
  );
};

exports.registerUser = catchAsync(async (req, res) => {
  const validation = validateAuthPayload(req.body, { requireUsername: true });
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { username, email, password } = validation.value;

  const userFound = await User.findOne({ email });
  if (userFound) {
    return res.status(400).json({
      success: false,
      message: "User with that email already registered"
    });
  }

  const userData = await User.create({
    username,
    email,
    password: bcrypt.hashSync(password, 10)
  });

  const token = signToken(userData);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    data: {
      id: userData._id,
      username: userData.username,
      email: userData.email,
      role: userData.role
    }
  });
});

exports.loginUser = catchAsync(async (req, res) => {
  const validation = validateAuthPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { email, password } = validation.value;

  const userFound = await User.findOne({ email });
  if (!userFound) {
    return res.status(404).json({
      success: false,
      message: "User with that email is not registered"
    });
  }

  const isMatched = bcrypt.compareSync(password, userFound.password);
  if (!isMatched) {
    return res.status(400).json({
      success: false,
      message: "Invalid password"
    });
  }

  const token = signToken(userFound);

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    token,
    data: {
      id: userFound._id,
      username: userFound.username,
      email: userFound.email,
      role: userFound.role
    }
  });
});

exports.logoutUser = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
    token: null
  });
});

exports.becomeDriver = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (user.role === "admin") {
    return res.status(400).json({
      success: false,
      message: "Admin account cannot be changed to driver through this action"
    });
  }

  if (user.role !== "driver") {
    user.role = "driver";
    await user.save();
  }

  const token = signToken(user);

  res.status(200).json({
    success: true,
    message: "Your account is ready for driver features",
    token,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});
