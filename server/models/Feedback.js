const mongoose = require('mongoose');

// IMPORTANT: No userId or studentId field to guarantee absolute anonymity!
const feedbackSchema = new mongoose.Schema({
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Target faculty or HOD
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  category: { type: String, enum: ['Teaching', 'Infrastructure', 'Behaviour', 'General'], default: 'General' },
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  sentiment: { type: String, enum: ['Positive', 'Neutral', 'Stressed/Negative'], default: 'Neutral' },
  sentimentScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
