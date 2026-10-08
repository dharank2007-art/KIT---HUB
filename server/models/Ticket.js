const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Leave', 'OD', 'Bonafide', 'Doubt', 'Complaint'], 
    required: true 
  },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Escalated'], 
    default: 'Pending' 
  },
  attachments: [{ type: String }],
  timeline: [timelineSchema],
  escalationLevel: { type: Number, default: 0 }, // 0: Faculty, 1: HOD, 2: Super Admin
  lastEscalatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
