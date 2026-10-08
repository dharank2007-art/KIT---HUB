const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/achievements
// @desc    Get all achievements
router.get('/', protect, async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category) filter.category = category;

    const achievements = await Achievement.find(filter)
      .populate('author', 'name role avatar department registerNumber employeeId')
      .sort({ createdAt: -1 });

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/achievements
// @desc    Post achievement
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, image } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const achievement = new Achievement({
      author: req.user._id,
      title,
      description,
      category: category || 'Academic',
      image: image || ''
    });

    await achievement.save();

    const populated = await Achievement.findById(achievement._id)
      .populate('author', 'name role avatar department');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/achievements/:id/like
// @desc    Like / unlike achievement
router.post('/:id/like', protect, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ message: 'Achievement not found' });

    const index = achievement.likes.indexOf(req.user._id);
    if (index === -1) {
      achievement.likes.push(req.user._id);
    } else {
      achievement.likes.splice(index, 1);
    }

    await achievement.save();
    res.json({ likesCount: achievement.likes.length, liked: index === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
