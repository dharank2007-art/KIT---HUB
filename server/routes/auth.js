const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ValidStudent = require('../models/ValidStudent');
const Department = require('../models/Department');
const { protect } = require('../middleware/authMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'kit_college_app_super_secret_jwt_key_2026', {
    expiresIn: '30d'
  });
};

const isValidLinkedIn = (value) => {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname) && /^\/in\/[\w%-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, registerNumber, department, className, bloodGroup, phone, linkedin, portfolio } = req.body;
    if (!name || !email || !password || !registerNumber || !department || !className || !bloodGroup || !linkedin) {
      return res.status(400).json({ message: 'Name, email, password, roll number, department, class, blood group, and LinkedIn are required' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (!isValidLinkedIn(linkedin)) return res.status(400).json({ message: 'Enter a valid LinkedIn profile URL' });
    if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
      return res.status(400).json({ message: 'Select a valid blood group' });
    }

    const departmentRecord = await Department.findById(department);
    if (!departmentRecord) return res.status(400).json({ message: 'Select a valid department' });
    const normalizedRegisterNumber = registerNumber.trim().toUpperCase();
    const rosterEntry = await ValidStudent.findOne({
      registerNumber: normalizedRegisterNumber,
      department: departmentRecord._id,
      className: className.trim()
    });
    if (!rosterEntry) return res.status(400).json({ message: 'Roll number, department, and class do not match the college roster' });

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail }) || await User.exists({ registerNumber: normalizedRegisterNumber })) {
      return res.status(409).json({ message: 'An account already exists for this email or roll number' });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'student',
      department: departmentRecord._id,
      registerNumber: normalizedRegisterNumber,
      className: className.trim(),
      bloodGroup,
      phone: phone?.trim() || '',
      linkedin: linkedin.trim(),
      portfolio: portfolio?.trim() || '',
      status: 'pending',
      isPasswordChanged: true
    });
    await user.save();
    res.status(201).json({ message: 'Registration submitted. An administrator must approve your account before you can sign in.', status: user.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('department');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role === 'student' && user.status && user.status !== 'approved') {
      return res.status(403).json({
        message: user.status === 'pending'
          ? 'Your registration is awaiting administrator approval.'
          : 'Your registration was not approved. Contact your department administrator.'
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // super_admin, admin, staff, student
      department: user.department,
      employeeId: user.employeeId,
      registerNumber: user.registerNumber,
      className: user.className,
      bloodGroup: user.bloodGroup,
      linkedin: user.linkedin,
      portfolio: user.portfolio,
      phone: user.phone,
      avatar: user.avatar,
      isPasswordChanged: user.isPasswordChanged,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('department assignedMentor');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Force or optional password change
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);

    // If first time password change or provided current password
    if (user.isPasswordChanged && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    user.isPasswordChanged = true;
    await user.save();

    res.json({ message: 'Password updated successfully', isPasswordChanged: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
