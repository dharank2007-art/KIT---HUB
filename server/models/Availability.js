const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { 
    type: String, 
    enum: ['In class', 'In cabin', 'Free', 'On leave'], 
    default: 'Free' 
  },
  note: { type: String, default: '' },
  location: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Availability', availabilitySchema);
