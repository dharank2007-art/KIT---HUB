const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const normalizeDepartment = user => user?.department?._id || user?.department || null;

const isSameDepartmentChatAllowed = (firstUser, secondUser) => {
  if (!firstUser || !secondUser) return false;
  if (firstUser.role === 'super_admin' || secondUser.role === 'super_admin') return true;
  const firstDepartment = normalizeDepartment(firstUser);
  const secondDepartment = normalizeDepartment(secondUser);
  return !!firstDepartment && !!secondDepartment && firstDepartment.toString() === secondDepartment.toString();
};

const isAllowedConversation = (firstUser, secondUser) => {
  if (!firstUser || !secondUser || firstUser._id.toString() === secondUser._id.toString()) return false;
  const participantsAreStudentAndFaculty =
    (firstUser.role === 'student' && secondUser.role === 'staff') ||
    (firstUser.role === 'staff' && secondUser.role === 'student');
  return participantsAreStudentAndFaculty && isSameDepartmentChatAllowed(firstUser, secondUser);
};

const canAccessFacultyPost = (post, currentUser) => {
  if (!post || !currentUser || currentUser.role === 'student') return false;
  if (currentUser.role === 'super_admin') return true;

  const postAuthorId = post.author?._id || post.author;
  const currentUserId = currentUser._id;
  if (postAuthorId && currentUserId && postAuthorId.toString() === currentUserId.toString()) {
    return true;
  }

  if (currentUser.role === 'admin') {
    const postDepartment = post.department?._id || post.department;
    const userDepartment = normalizeDepartment(currentUser);
    return !!postDepartment && !!userDepartment && postDepartment.toString() === userDepartment.toString();
  }

  return false;
};

// @route   GET /api/chat/inbox
// @desc    Get latest chat activity for the current user's department contacts
router.get('/inbox', protect, async (req, res) => {
  try {
    if (!['student', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chat is available only to students and faculty' });
    }

    const department = normalizeDepartment(req.user);
    if (!department) return res.json([]);

    const contactRole = req.user.role === 'staff' ? 'student' : 'staff';
    const contacts = await User.find({ role: contactRole, department, status: 'approved' }).select('_id');
    if (contacts.length === 0) return res.json([]);

    const contactIds = contacts.map(contact => contact._id);
    const inbox = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id, recipient: { $in: contactIds } },
            { recipient: req.user._id, sender: { $in: contactIds } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$sender', req.user._id] }, '$recipient', '$sender'] },
          latestMessage: {
            $first: {
              _id: '$_id',
              message: '$message',
              attachments: '$attachments',
              createdAt: '$createdAt'
            }
          },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$recipient', req.user._id] }, { $eq: ['$read', false] }] }, 1, 0]
            }
          }
        }
      },
      { $sort: { 'latestMessage.createdAt': -1 } },
      { $project: { _id: 0, contactId: '$_id', latestMessage: 1, unreadCount: 1 } }
    ]);

    res.json(inbox);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/chat/:userId
// @desc    Get chat conversation with specific user
router.get('/:userId', protect, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;
    const targetUser = await User.findById(targetUserId).select('_id role department');
    if (!isAllowedConversation(req.user, targetUser)) {
      return res.status(403).json({ message: 'Chat is available only between students and faculty in the same department' });
    }

    const messages = await ChatMessage.find({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    })
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .sort({ createdAt: 1 });

    await ChatMessage.updateMany(
      { sender: targetUserId, recipient: currentUserId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/chat
// @desc    Send 1:1 chat message with attachments
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, message, attachments } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    const recipient = await User.findById(recipientId).select('_id role department');
    if (!isAllowedConversation(req.user, recipient)) {
      return res.status(403).json({ message: 'Chat is available only between students and faculty in the same department' });
    }

    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Message or attachment required' });
    }

    const newMsg = new ChatMessage({
      sender: req.user._id,
      recipient: recipientId,
      message: message || '',
      attachments: attachments || []
    });

    await newMsg.save();

    const populated = await ChatMessage.findById(newMsg._id)
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/chat/:messageId
// @desc    Soft-delete a message (sender only)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // only sender can soft-delete their message (per user preference)
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the sender can delete this message' });
    }

    // mark as deleted and clear sensitive content
    msg.deleted = true;
    msg.deletedBy = req.user._id;
    msg.deletedAt = new Date();
    msg.message = '';
    msg.attachments = [];

    await msg.save();

    const populated = await ChatMessage.findById(msg._id)
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .populate('deletedBy', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
module.exports.isAllowedConversation = isAllowedConversation;
module.exports.isSameDepartmentChatAllowed = isSameDepartmentChatAllowed;
module.exports.canAccessFacultyPost = canAccessFacultyPost;
