const mongoose = require('mongoose');

const facultyPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  caption: { type: String, required: true, trim: true, maxlength: 25000 },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  finalAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

facultyPostSchema.index({ department: 1, finalAt: 1 });

module.exports = mongoose.model('FacultyPost', facultyPostSchema);
