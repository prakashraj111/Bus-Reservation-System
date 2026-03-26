const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const catchAsync = require("../../utils/catchAsync");

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.SECRET_KEY,
    { expiresIn: "30d" }
  );
};

exports.registerUser = catchAsync(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide username, email and password"
    });
  }

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password"
    });
  }

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
