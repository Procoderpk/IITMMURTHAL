const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ["patient", "doctor", "hospital"],
      required: true,
      index: true,
    },
    approved: { type: Boolean, default: false },
    patientCode: { type: String, sparse: true, unique: true },
    department: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);