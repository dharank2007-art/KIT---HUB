const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: '' },
  bookedAt: { type: Date, default: Date.now },
  reminderSentAt: { type: Date, default: null },
  status: { type: String, enum: ['Booked', 'Cancelled', 'Completed'], default: 'Booked' }
});

const slotSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // e.g., "10:00 AM"
  endTime: { type: String, required: true }, // e.g., "10:10 AM"
  location: { type: String, default: 'Faculty Cabin' },
  maxStudents: { type: Number, default: 1 },
  notes: { type: String, default: '' },
  isCancelled: { type: Boolean, default: false },
  bookings: [bookingSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Slot', slotSchema);
