const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    patientCode: { type: String, required: true, unique: true },
    dateOfBirth: Date,
    bloodGroup: String,
    allergies: [String],
    emergencyContact: {
      name: String,
      phone: String,
    },
    assignedDoctors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);