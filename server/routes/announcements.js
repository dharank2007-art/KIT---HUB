const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// @route   GET /api/announcements
// @desc    Get announcements (global, community board, or departmental)
router.get('/', protect, async (req, res) => {
  try {
    const { isCommunityBoard, isGlobal } = req.query;
    let filter = {};

    if (isCommunityBoard === 'true') {
      filter.isCommunityBoard = true;
    } else {
      if (req.user.role === 'student' || req.user.role === 'staff') {
        filter.$or = [
          { isGlobal: true },
          { department: req.user.department?._id || req.user.department }
        ];
      } else if (req.user.role === 'admin') {
        filter.$or = [
          { isGlobal: true },
          { department: req.user.department?._id || req.user.department }
        ];
      }
    }

    const list = await Announcement.find(filter)
      .populate('author', 'name role avatar')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement / circular PDF / community board post
router.post('/', protect, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { title, content, isGlobal, isCommunityBoard, attachments } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    if (isCommunityBoard && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only Super Admin can post to Community Board' });
    }
    if (req.user.role === 'admin' && isGlobal) {
      return res.status(403).json({ message: 'HODs may only post announcements to their department' });
    }

    const ann = new Announcement({
      title,
      content,
      author: req.user._id,
      department: isGlobal ? null : (req.user.department?._id || req.user.department),
      isGlobal: !!isGlobal || req.user.role === 'super_admin',
      isCommunityBoard: !!isCommunityBoard,
      attachments: attachments || []
    });

    await ann.save();

    // Create notifications for target users
    const userFilter = isGlobal ? {} : { department: req.user.department?._id || req.user.department };
    const recipients = await User.find(userFilter).select('_id');

    for (let r of recipients) {
      if (r._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: r._id,
          title: `Announcement: ${title}`,
          message: `${req.user.name} published a new announcement.`,
          type: 'announcement',
          link: '/announcements'
        });
      }
    }

    const populated = await Announcement.findById(ann._id)
      .populate('author', 'name role avatar')
      .populate('department', 'name code');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
