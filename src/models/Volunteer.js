// Volunteer Model
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  interests: [{
    type: String,
    trim: true
  }],
  availability: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  emergency_contact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  },
  background_check_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  onboarding_completed: {
    type: Boolean,
    default: false
  },
  total_hours_volunteered: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  community_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
volunteerSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes for better query performance
volunteerSchema.index({ user_id: 1 });
volunteerSchema.index({ community_id: 1 });
volunteerSchema.index({ background_check_status: 1 });
volunteerSchema.index({ skills: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);
