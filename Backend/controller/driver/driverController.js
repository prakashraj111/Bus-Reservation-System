const Bus = require("../../models/busModel");
const fs = require("fs");
const catchAsync = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");

const canManageBus = (bus, user) => {
  if (!bus || !user) return false;
  if (user.role ===  "driver" || "admin") return true;
  return bus.driverId && bus.driverId.toString() === user.id;
};

exports.getMyBuses = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // Logged-in user ID

  const buses = await Bus.find({ driverId: userId });

  res.status(200).json({ success: true, buses });
});

exports.getOnePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const post = await Bus.findById(id)
               .populate("reviews");

  if (!post) {
    return res.status(404).json({
      success: false,
      message: "Bus not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "Post fetched successfully",
    data: post
  });
});

exports.createBusPost = catchAsync(async (req, res) => {
  const {
    busName,
    description,
    operator,
    busNumberPlate,
    type,
    totalSeats
  } = req.body;

  if (!busName || !description || !operator || !busNumberPlate || !type || !totalSeats) {
    return res.status(400).json({
      success: false,
      message: "Some fields are missing"
    });
  }

  const filePath = req.file
    ? req.file.filename
    : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1dQPM88-Vq0f-YM8xILMQdKktXgKBMN6XH9cCBleA&s";

    // ✅ Check and Update Role to Driver
    const user = await User.findById(req.user.id);

    if (user.role === "user") {
      user.role = "driver";
      await user.save();
    }

  const postCreated = await Bus.create({
    busName,
    description,
    operator,
    busNumberPlate,
    type,
    totalSeats,
    imageUrl: filePath,
    driverId: req.user.id
  });

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    data: postCreated
  });
});

exports.deletePost = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Please provide id"
    });
  }

  const oldData = await Bus.findById(id);
  if (!oldData) {
    return res.status(404).json({
      success: false,
      message: "No data found with that id"
    });
  }

  if (!canManageBus(oldData, req.user)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to delete this bus"
    });
  }
     // 🧹 DELETE ALL REVIEWS of this bus
    if (oldData.reviews && oldData.reviews.length > 0) {
      await Review.deleteMany({
        _id: { $in: oldData.reviews }
      })
    }


  if (oldData.imageUrl && !oldData.imageUrl.startsWith("http")) {
    fs.unlink(`./uploads/${oldData.imageUrl}`, (err) => {
      if (err) console.log("Error deleting file:", err.message);
    });
  }

  await Bus.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Bus deleted successfully"
  });
});

exports.updateBusPost = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Please provide id"
    });
  }

  const oldData = await Bus.findById(id);
  if (!oldData) {
    return res.status(404).json({
      success: false,
      message: "Bus not found"
    });
  }

  if (!canManageBus(oldData, req.user)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to update this bus"
    });
  }

  let filePath = oldData.imageUrl;
  if (req.file) {
    if (oldData.imageUrl && !oldData.imageUrl.startsWith("http")) {
      fs.unlink(`./uploads/${oldData.imageUrl}`, (err) => {
        if (err) console.log("Error deleting old image:", err.message);
      });
    }
    filePath = req.file.filename;
  }

  const payload = {
    busName: req.body.busName || oldData.busName,
    description: req.body.description || oldData.description,
    operator: req.body.operator || oldData.operator,
    busNumberPlate: req.body.busNumberPlate || oldData.busNumberPlate,
    type: req.body.type || oldData.type,
    totalSeats: req.body.totalSeats || oldData.totalSeats,
    imageUrl: filePath
  };

  const updatedBus = await Bus.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Bus updated successfully",
    data: updatedBus
  });
});


