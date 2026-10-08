const express = require('express');
const router = express.Router();
const Availability = require('../models/Availability');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// @route   GET /api/availability
// @desc    Get all faculty availability statuses
router.get('/', protect, async (req, res) => {
  try {
    const statuses = await Availability.find({})
      .populate({
        path: 'faculty',
        select: 'name email role department employeeId avatar phone',
        populate: { path: 'department', select: 'name code' }
      });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/availability/toggle
// @desc    Quick toggle or update availability (Faculty / HOD)
router.post('/toggle', protect, requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { status, note, location } = req.body;
    if (!['In class', 'In cabin', 'Free', 'On leave'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let avail = await Availability.findOne({ faculty: req.user._id });
    if (!avail) {
      avail = new Availability({
        faculty: req.user._id,
        status,
        note: note || '',
        location: location || ''
      });
    } else {
      avail.status = status;
      if (note !== undefined) avail.note = note;
      if (location !== undefined) avail.location = location;
      avail.updatedAt = new Date();
    }

    await avail.save();

    const populated = await Availability.findById(avail._id)
      .populate({
        path: 'faculty',
        select: 'name email role department employeeId avatar phone',
        populate: { path: 'department', select: 'name code' }
      });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
