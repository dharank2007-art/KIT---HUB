const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  attendancePercentage: { type: Number, required: true, min: 0, max: 100 },
  marksPercentage: { type: Number, required: true, min: 0, max: 100 },
  remarks: { type: String, default: '' },
  flagged: { type: Boolean, default: false }, // true if attendance < 75% or marks < 50%
  updatedAt: { type: Date, default: Date.now }
});

academicRecordSchema.pre('save', function (next) {
  this.flagged = (this.attendancePercentage < 75 || this.marksPercentage < 50);
  next();
});

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
