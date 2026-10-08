const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getAIResponse } = require('../services/aiService');

// @route   POST /api/ai/query
// @desc    Ask AI assistant
router.post('/query', protect, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Query string is required' });
    }
    if (typeof query !== 'string' || query.length > 2000) {
      return res.status(400).json({ message: 'Query must be text of at most 2000 characters' });
    }

    const aiResult = await getAIResponse(query, {
      role: req.user.role,
      name: req.user.name,
      department: req.user.department
    });

    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/ai/faqs
// @desc    Get all FAQs
router.get('/faqs', protect, async (req, res) => {
  try {
    const faqs = await FAQ.find({}).sort({ category: 1, createdAt: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/ai/faqs
// @desc    Add FAQ (Super Admin)
router.post('/faqs', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    const faq = new FAQ({
      question,
      answer,
      category: category || 'General',
      createdBy: req.user._id
    });

    await faq.save();
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/faqs/:id', protect, requireRole('super_admin'), async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category: category || 'General' },
      { new: true, runValidators: true }
    );
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/ai/faqs/:id
// @desc    Delete FAQ (Super Admin)
router.delete('/faqs/:id', protect, requireRole('super_admin'), async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
