const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();
const otpStore = new Map();

const DEMO_OTP_MODE = process.env.NODE_ENV !== "production";

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username || "",
    role: user.role,
    department: user.department || "",
  };
}

// DEMO ONLY. This is not Aadhaar authentication or SMS delivery.
router.post("/send-otp", async (req, res) => {
  try {
    if (!DEMO_OTP_MODE) {
      return res.status(503).json({
        message: "Connect an approved identity/OTP provider first",
      });
    }

    const { demoId } = req.body;

    if (typeof demoId !== "string" ||
        !/^[a-zA-Z0-9_-]{4,40}$/.test(demoId.trim())) {
      return res.status(400).json({ message: "Enter a valid demo patient ID" });
    }

    const patient = await User.findOne({
      patientCode: demoId.trim().toUpperCase(),
      role: "patient",
      approved: true,
    });

    // Do not reveal whether a patient ID exists.
    if (!patient) {
      return res.status(400).json({
        message: "Unable to start demo verification for this ID",
      });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = await bcrypt.hash(`${salt}:${otp}`, 10);

    otpStore.set(patient._id.toString(), {
      otpHash,
      salt,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    res.set("Cache-Control", "no-store");
    res.json({
      message: "Demo OTP generated. No SMS was sent.",
      ...(DEMO_OTP_MODE ? { demoOtp: otp } : {}),
    });
  } catch (error) {
    console.error("Demo OTP error:", error.message);
    res.status(500).json({ message: "Could not start verification" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    if (!DEMO_OTP_MODE) {
      return res.status(503).json({
        message: "Configure an approved verification provider",
      });
    }

    const { demoId, otp } = req.body;

    if (typeof demoId !== "string" ||
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid verification details" });
    }

    const patient = await User.findOne({
      patientCode: demoId.trim().toUpperCase(),
      role: "patient",
      approved: true,
    });

    if (!patient) {
      return res.status(401).json({ message: "Verification failed" });
    }

    const key = patient._id.toString();
    const record = otpStore.get(key);

    if (!record || record.expiresAt < Date.now()) {
      otpStore.delete(key);
      return res.status(401).json({
        message: "OTP expired. Request a new demo OTP.",
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(key);
      return res.status(429).json({
        message: "Too many attempts. Request a new OTP.",
      });
    }

    record.attempts += 1;

    const valid = await bcrypt.compare(`${record.salt}:${otp}`, record.otpHash);

    if (!valid) {
      return res.status(401).json({ message: "Incorrect OTP" });
    }

    otpStore.delete(key);

    res.set("Cache-Control", "no-store");
    return res.json({
      message: "Demo patient login successful",
      token: makeToken(patient),
      user: safeUser(patient),
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({ message: "Verification failed" });
  }
});

async function staffLogin(req, res, role) {
  try {
    const { username, password } = req.body;

    if (typeof username !== "string" ||
        typeof password !== "string" ||
        !username.trim() || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase(),
      role,
    }).select("+password");

    if (!user || !user.password ||
        !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (!user.approved) {
      return res.status(403).json({
        message: "Staff account is awaiting authorization",
      });
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      message: "Login successful",
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Staff login error:", error.message);
    return res.status(500).json({ message: "Login failed" });
  }
}

router.post("/doctor-login", (req, res) => staffLogin(req, res, "doctor"));
router.post("/hospital-login", (req, res) => staffLogin(req, res, "hospital"));

module.exports = router;