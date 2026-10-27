
const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Demo-only in-memory storage.
// Restarting the server clears all OTPs.
const otpStore = new Map();
const limits = new Map();

const OTP_TTL = 5 * 60 * 1000;
const RESEND_DELAY = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashOtp(otp) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(otp)
    .digest("hex");
}

function allowed(key, max, windowMs) {
  const now = Date.now();
  let item = limits.get(key);

  if (!item || now - item.start >= windowMs) {
    item = { start: now, count: 0 };
  }

  if (item.count >= max) {
    limits.set(key, item);
    return false;
  }

  item.count++;
  limits.set(key, item);
  return true;
}

function validDemoId(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_-]{4,40}$/.test(value)
  );
}

// POST /api/auth/send-otp
router.post("/send-otp", (req, res) => {
  if (process.env.DEMO_OTP_ENABLED !== "true") {
    return res.status(403).json({
      message: "Demo OTP is disabled"
    });
  }

  const { demoId } = req.body;

  if (!validDemoId(demoId)) {
    return res.status(400).json({
      message: "Enter a valid demo ID (4-40 characters)"
    });
  }

  const id = demoId.toLowerCase();
  const ip = req.ip || "unknown";

  if (
    !allowed(`ip:${ip}`, 10, 15 * 60 * 1000) ||
    !allowed(`id:${id}`, 5, 15 * 60 * 1000)
  ) {
    return res.status(429).json({
      message: "Too many requests. Please try later."
    });
  }

  const previous = otpStore.get(id);

  if (previous && Date.now() < previous.resendAfter) {
    return res.status(429).json({
      message: "Please wait 60 seconds before requesting another OTP."
    });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  otpStore.set(id, {
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + OTP_TTL,
    resendAfter: Date.now() + RESEND_DELAY,
    attempts: 0
  });

  // Demo only: OTP appears on the frontend and backend terminal.
  console.log(`[DEMO OTP] ${id}: ${otp}`);

  return res.status(200).json({
    message: "Demo OTP generated successfully",
    demoOtp: otp,
    expiresInSeconds: 300
  });
});

// POST /api/auth/verify-otp
router.post("/verify-otp", (req, res) => {
  if (process.env.DEMO_OTP_ENABLED !== "true") {
    return res.status(403).json({
      message: "Demo OTP is disabled"
    });
  }

  const { demoId, otp } = req.body;

  if (
    !validDemoId(demoId) ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    return res.status(400).json({
      message: "Enter a valid demo ID and 6-digit OTP"
    });
  }

  const id = demoId.toLowerCase();
  const record = otpStore.get(id);

  if (!record) {
    return res.status(400).json({
      message: "OTP not found. Request a new OTP."
    });
  }

  if (Date.now() >= record.expiresAt) {
    otpStore.delete(id);
    return res.status(400).json({
      message: "OTP expired. Request a new OTP."
    });
  }

  record.attempts++;

  if (record.attempts > MAX_ATTEMPTS) {
    otpStore.delete(id);
    return res.status(429).json({
      message: "Too many incorrect attempts. Request a new OTP."
    });
  }

  const expected = Buffer.from(record.otpHash, "hex");
  const submitted = Buffer.from(hashOtp(otp), "hex");

  if (!crypto.timingSafeEqual(expected, submitted)) {
    return res.status(401).json({
      message: "Incorrect OTP"
    });
  }

  // OTP can only be used once.
  otpStore.delete(id);

  const token = jwt.sign(
    {
      sub: `demo:${id}`,
      authMethod: "demo-otp"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
      issuer: "carebridge-ai"
    }
  );

  return res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: `demo:${id}`,
      name: "Demo Patient",
      role: "patient"
    }
  });
});

module.exports = router;
