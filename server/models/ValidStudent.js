const mongoose = require('mongoose');

const validStudentSchema = new mongoose.Schema({
  registerNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  className: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ValidStudent', validStudentSchema);