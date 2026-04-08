require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");

const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  await mongoose.connect(mongoUri);
  console.log("Database connected successfully");
};

const seedAdmin = async () => {
  const [, , usernameArg, emailArg, passwordArg] = process.argv;

  const username = usernameArg?.trim() || "admin";
  const email = emailArg?.trim().toLowerCase() || "admin@gmail.com";
  const password = passwordArg?.trim() || "adminn";

  const hashedPassword = bcrypt.hashSync(password, 10);
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    existingUser.username = username;
    existingUser.password = hashedPassword;
    existingUser.role = "admin";
    await existingUser.save();

    console.log(`Existing user upgraded to admin: ${email}`);
    return;
  }

  await User.create({
    username,
    email,
    password: hashedPassword,
    role: "admin"
  });

  console.log(`Admin user created successfully: ${email}`);
};

const run = async () => {
  try {
    await connectDatabase();
    await seedAdmin();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
