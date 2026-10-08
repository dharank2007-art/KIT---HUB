const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/public', async (req, res) => {
  try {
    const departments = await Department.find({}).select('name code').sort({ code: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/departments
// @desc    Get all departments
router.get('/', protect, async (req, res) => {
  try {
    const departments = await Department.find({}).populate('hod', 'name email employeeId phone avatar');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/departments
// @desc    Create department (Super Admin)
router.post('/', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, code, hod, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and Code are required' });
    }

    const dept = new Department({ name, code, hod, description });
    await dept.save();
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department (Super Admin)
router.put('/:id', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('hod', 'name email');
    res.json(dept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
