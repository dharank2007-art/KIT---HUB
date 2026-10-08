const express = require('express');
const router = express.Router();
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

const populateRequestUsers = query => query.populate([
  { path: 'requester', select: 'name department', populate: { path: 'department', select: 'name code' } },
  { path: 'donor', select: 'name department', populate: { path: 'department', select: 'name code' } }
]);

router.get('/received', protect, async (req, res) => {
  try {
    const requests = await populateRequestUsers(
      BloodRequest.find({ donor: req.user._id }).sort({ createdAt: -1 }).limit(50)
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/sent', protect, async (req, res) => {
  try {
    const requests = await populateRequestUsers(
      BloodRequest.find({ requester: req.user._id }).sort({ createdAt: -1 }).limit(50)
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { donorId, location, urgency, message = '' } = req.body;
    if (typeof donorId !== 'string' || !/^[\da-f]{24}$/i.test(donorId) ||
      typeof location !== 'string' || !location.trim() || location.trim().length > 120 ||
      !['normal', 'urgent', 'critical'].includes(urgency) || typeof message !== 'string') {
      return res.status(400).json({ message: 'Donor, request location, and a valid urgency are required' });
    }
    if (message.length > 500) {
      return res.status(400).json({ message: 'Message must be 500 characters or fewer' });
    }

    const donor = await User.findOne({ _id: donorId, role: 'student', status: 'approved', bloodGroup: { $ne: '' } });
    if (!donor) return res.status(404).json({ message: 'Approved blood donor not found' });
    if (donor._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot send a request to yourself' });
    }

    const request = await BloodRequest.create({
      requester: req.user._id,
      donor: donor._id,
      bloodGroup: donor.bloodGroup,
      location: location.trim(),
      urgency,
      message: message.trim()
    });
    await Notification.create({
      user: donor._id,
      title: 'Blood donation request',
      message: `${req.user.name} sent a ${urgency} request for ${donor.bloodGroup} blood.`,
      type: 'info',
      link: '/blood-finder'
    });

    const populated = await populateRequestUsers(BloodRequest.findById(request._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or declined' });
    }
    const request = await BloodRequest.findOne({ _id: req.params.id, donor: req.user._id });
    if (!request) return res.status(404).json({ message: 'Blood request not found' });
    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'This blood request has already been answered' });
    }

    request.status = status;
    await request.save();
    await Notification.create({
      user: request.requester,
      title: `Blood request ${status}`,
      message: `${req.user.name} ${status} your ${request.bloodGroup} blood request.`,
      type: 'info',
      link: '/blood-finder'
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;