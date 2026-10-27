
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { extractText, analyzeReport } = require("../services/reportAnalyzer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Upload only a PDF, JPG, or PNG report."));
    }

    cb(null, true);
  }
});

function requirePatient(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in again." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.id || payload.role !== "patient") {
      return res.status(403).json({
        message: "Only an authenticated patient can analyze a report."
      });
    }

    req.patientId = payload.id;
    next();
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again."
    });
  }
}

// Basic file-signature check to supplement MIME validation.
function hasValidSignature(file) {
  const b = file.buffer;

  if (file.mimetype === "application/pdf") {
    return b.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (file.mimetype === "image/png") {
    return b.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
  }

  if (file.mimetype === "image/jpeg") {
    return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  }

  return false;
}

router.post(
  "/analyze",
  requirePatient,
  (req, res, next) => {
    upload.single("report")(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "Report must be 8 MB or smaller."
          });
        }

        return res.status(400).json({
          message: "Could not upload the report."
        });
      }

      if (error) {
        return res.status(400).json({
          message: error.message || "Invalid report upload."
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");

      if (!req.file) {
        return res.status(400).json({
          message: "Choose a PDF, JPG, or PNG report first."
        });
      }

      if (!hasValidSignature(req.file)) {
        return res.status(400).json({
          message: "The file contents do not match the selected file type."
        });
      }

      const patient = await User.findOne({
        _id: req.patientId,
        role: "patient",
        approved: true
      }).select("_id");

      if (!patient) {
        return res.status(403).json({
          message: "An approved patient account is required."
        });
      }

      const language = req.body.language === "hi" ? "hi" : "en";

      const text = await extractText(req.file);

      if (!text || text.trim().length < 20) {
        return res.status(422).json({
          message:
            "We could not read enough text. Upload a clearer report image or a text-based PDF."
        });
      }

      const analysis = await analyzeReport(text, language);

      return res.status(200).json({
        message: "Report analyzed. Please review the results with a clinician.",
        language,
        analysis,
        disclaimer:
          "AI-generated explanation only. It is not a diagnosis or treatment plan. Confirm results with a qualified healthcare professional."
      });
    } catch (error) {
      console.error("Medical report analysis failed:", error.message);

      if (
        error.message.includes("GROQ_API_KEY") ||
        error.message.includes("GROQ") ||
        error.message.includes("API key")
      ) {
        return res.status(503).json({
          message: "AI analysis is not configured. Please contact the administrator."
        });
      }

      if (
        error.message.includes("no extractable text") ||
        error.message.includes("Unsupported report format")
      ) {
        return res.status(422).json({ message: error.message });
      }

      return res.status(502).json({
        message:
          "The report could not be analyzed right now. Check the file and try again."
      });
    }
  }
);

module.exports = router;
