const express = require("express");
const CareTask = require("../models/CareTask");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { authenticate, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// Patient's own care tasks only
router.get("/patient/tasks", allowRoles("patient"), async (req, res) => {
  try {
    const tasks = await CareTask.find({ patient: req.user.id })
      .sort({ dueAt: 1 })
      .limit(100)
      .lean();

    res.json({ tasks });
  } catch {
    res.status(500).json({ message: "Could not load patient tasks" });
  }
});

// Patient's own profile only
router.get("/patient/profile", allowRoles("patient"), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user.id })
      .populate("user", "name patientCode")
      .lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    res.json({ patient });
  } catch {
    res.status(500).json({ message: "Could not load patient profile" });
  }
});

// Doctor sees only tasks assigned to them
router.get("/doctor/tasks", allowRoles("doctor"), async (req, res) => {
  try {
    const tasks = await CareTask.find({ assignedDoctor: req.user.id })
      .populate("patient", "name patientCode")
      .sort({ dueAt: 1 })
      .limit(100)
      .lean();

    res.json({ tasks });
  } catch {
    res.status(500).json({ message: "Could not load assigned tasks" });
  }
});

// Hospital-wide aggregate counts, no patient details exposed
router.get("/hospital/overview", allowRoles("hospital"), async (req, res) => {
  try {
    const [patients, doctors, pending, overdue, departments] = await Promise.all([
      User.countDocuments({ role: "patient", approved: true }),
      User.countDocuments({ role: "doctor", approved: true }),
      CareTask.countDocuments({ status: { $in: ["pending", "upcoming"] } }),
      CareTask.countDocuments({ status: { $in: ["overdue", "escalated"] } }),
      User.distinct("department", { role: "doctor", approved: true }),
    ]);

    res.json({
      counts: {
        patients,
        doctors,
        pendingTasks: pending,
        overdueTasks: overdue,
        departments: departments.filter(Boolean).length,
      },
    });
  } catch {
    res.status(500).json({ message: "Could not load hospital overview" });
  }
});

// Hospital coordination queue, without unrestricted clinical records
router.get("/hospital/tasks", allowRoles("hospital"), async (req, res) => {
  try {
    const tasks = await CareTask.find({
      status: { $in: ["pending", "overdue", "escalated"] },
    })
      .select("title type department dueAt status assignedDoctor")
      .populate("assignedDoctor", "name department")
      .sort({ dueAt: 1 })
      .limit(100)
      .lean();

    res.json({ tasks });
  } catch {
    res.status(500).json({ message: "Could not load coordination queue" });
  }
});

module.exports = router;