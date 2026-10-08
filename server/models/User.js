const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'staff', 'student'], 
    required: true 
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  registerNumber: { type: String, trim: true }, // For students
  className: { type: String, trim: true },
  bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
  linkedin: { type: String, trim: true, default: '' },
  portfolio: { type: String, trim: true, default: '' },
  employeeId: { type: String, trim: true }, // For faculty/HOD
  designation: { type: String, trim: true, default: '' },
  subjects: { type: [String], default: [] },
  phone: { type: String, trim: true },
  avatar: { type: String, default: '' },
  profileQrToken: { type: String, default: '', select: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  approvalReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalReviewedAt: { type: Date },
  approvalNote: { type: String, trim: true, default: '' },
  isPasswordChanged: { type: Boolean, default: false },
  assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
