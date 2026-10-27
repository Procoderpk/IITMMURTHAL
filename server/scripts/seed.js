require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Patient = require("../models/Patient");
const CareTask = require("../models/CareTask");

async function upsertStaff({ username, password, name, role, department }) {
  if (!username || !password) {
    throw new Error(`Missing demo credentials for ${role}`);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  return User.findOneAndUpdate(
    { username: username.toLowerCase(), role },
    {
      $set: {
        name,
        username: username.toLowerCase(),
        password: hashedPassword,
        role,
        department,
        approved: true,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
}

async function main() {
  await connectDB();

  const doctor = await upsertStaff({
    username: process.env.DEMO_DOCTOR_USERNAME,
    password: process.env.DEMO_DOCTOR_PASSWORD,
    name: "Demo Doctor",
    role: "doctor",
    department: "General Medicine",
  });

  await upsertStaff({
    username: process.env.DEMO_HOSPITAL_USERNAME,
    password: process.env.DEMO_HOSPITAL_PASSWORD,
    name: "Demo Hospital Admin",
    role: "hospital",
    department: "Administration",
  });

  let patient = await User.findOne({ patientCode: "DEMO1234" });

  if (!patient) {
    patient = await User.create({
      name: "Demo Patient",
      patientCode: "DEMO1234",
      role: "patient",
      approved: true,
    });
  }

  await Patient.findOneAndUpdate(
    { user: patient._id },
    {
      $setOnInsert: {
        user: patient._id,
        patientCode: "DEMO1234",
        assignedDoctors: [doctor._id],
        allergies: [],
      },
    },
    { upsert: true, new: true }
  );

  const taskCount = await CareTask.countDocuments({ patient: patient._id });

  if (taskCount === 0) {
    await CareTask.insertMany([
      {
        patient: patient._id,
        assignedDoctor: doctor._id,
        title: "Laboratory report review",
        type: "lab",
        department: "Pathology",
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "pending",
      },
      {
        patient: patient._id,
        assignedDoctor: doctor._id,
        title: "Routine follow-up",
        type: "followup",
        department: "General Medicine",
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "upcoming",
      },
    ]);
  }

  console.log("Demo seed completed.");
  console.log("Patient demo ID: DEMO1234");
  console.log("Doctor username:", process.env.DEMO_DOCTOR_USERNAME);
  console.log("Hospital username:", process.env.DEMO_HOSPITAL_USERNAME);
  console.log("Demo patient has synthetic data only.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });