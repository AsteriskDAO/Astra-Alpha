const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { type: String, default: 'daily_checkin' },
  scheduled_time: { type: String, default: '0 10 * * *' }, // cron format
  last_sent: Date,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Pre-save middleware to update timestamps
notificationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Notification', notificationSchema); 