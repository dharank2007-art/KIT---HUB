const mongoose = require('mongoose');

const mentorDiarySchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  topicsDiscussed: { type: String, required: true },
  goals: { type: String, default: '' },
  mentorNotes: { type: String, default: '' },
  academicStatus: { type: String, default: 'Satisfactory' },
  followUpDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MentorDiary', mentorDiarySchema);
