const mongoose = require("mongoose");

const careTaskSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["appointment", "lab", "referral", "followup", "prescription"],
      required: true,
    },
    department: { type: String, default: "General Medicine" },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["upcoming", "pending", "completed", "overdue", "escalated"],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
    consentConfirmed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CareTask", careTaskSchema);