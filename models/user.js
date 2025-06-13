const mongoose = require('mongoose')
const { createUserHash } = require('../utils/hash')
const { v4: uuidv4 } = require('uuid')

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  telegram_id: { type: String, required: true, unique: true },
  user_hash: { type: String, required: true },
  wallet_address: String,
  proof_of_passport_id: String,
  name: String,
  nickname: String,
  checkIns: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  lastCheckIn: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  isGenderVerified: { type: Boolean, default: false },
  isRegistered: { type: Boolean, default: false },
  weeklyCheckIns: [{
    week: Date, // Start of week
    count: { type: Number, default: 0 }
  }],
  averageWeeklyCheckIns: { type: Number, default: 0 },
})

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updated_at = new Date()
  next()
})

// Helper to get start of week
function getStartOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // Set to Sunday
  return d
}

// Method to record a check-in and update averages
userSchema.methods.recordCheckIn = async function() {
  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  
  // Find or create current week's record
  let weekRecord = this.weeklyCheckIns.find(w => 
    w.week.toISOString().split('T')[0] === startOfWeek.toISOString().split('T')[0]
  )
  
  if (!weekRecord) {
    weekRecord = { week: startOfWeek, count: 1 }  // Start with 1 since this is a new check-in
    this.weeklyCheckIns.push(weekRecord)
  } else {
    weekRecord.count += 1  // Increment existing week's count
  }
  
  // Increment other counts
  this.checkIns++
  this.lastCheckIn = now
  this.points += 1
  
  // Keep only last 4 weeks of data and sort by most recent
  const fourWeeksAgo = getStartOfWeek(new Date(now))
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21) // Go back 3 weeks from current week start
  
  this.weeklyCheckIns = this.weeklyCheckIns
    .filter(w => w.week >= fourWeeksAgo)
    .sort((a, b) => b.week - a.week)
    .slice(0, 4) // Ensure we only keep exactly 4 weeks
  
  // Calculate average: total check-ins divided by number of weeks
  const totalCheckins = this.weeklyCheckIns.reduce((sum, week) => sum + week.count, 0)
  this.averageWeeklyCheckIns = totalCheckins === 0 ? 0 : Math.round(totalCheckins / this.weeklyCheckIns.length)
  
  await this.save()
  return this.averageWeeklyCheckIns
}

// Static method to create a new user with proper hashing
userSchema.statics.createUser = async function(userData) {
  const newUserId = uuidv4()
  const userHash = createUserHash(newUserId)
  
  const user = new this({
    user_id: newUserId,
    telegram_id: userData.telegram_id,
    user_hash: userHash,
    name: userData.name,
    nickname: userData.nickname,
    points: userData.points || 0,
    weeklyCheckIns: [],
    averageWeeklyCheckIns: 0
  })

  return user.save()
}

userSchema.statics.addPoints = async function(telegramId, points) {
  const user = await this.findOneAndUpdate(
    { telegram_id: telegramId },
    { $inc: { points: points } },
    { new: true }
  )
}

userSchema.statics.checkIn = async function(telegramId) {
  const user = await this.findOneAndUpdate(
    { telegram_id: telegramId },
    { $inc: { checkIns: 1 }, $set: { lastCheckIn: new Date() } },
    { new: true }
  )
}

userSchema.methods.rollbackCheckIn = async function() {
  // Decrement points and check-ins
  this.points = Math.max(0, this.points - 1)
  this.checkIns = Math.max(0, this.checkIns - 1)
  
  // Update weekly check-ins
  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  
  let weekRecord = this.weeklyCheckIns.find(w => 
    w.week.getTime() === startOfWeek.getTime()
  )
  
  if (weekRecord && weekRecord.count > 0) {
    weekRecord.count--
    
    // Recalculate average using the same logic as recordCheckIn
    const totalCheckins = this.weeklyCheckIns.reduce((sum, week) => sum + week.count, 0)
    this.averageWeeklyCheckIns = totalCheckins === 0 ? 0 : Math.round(totalCheckins / this.weeklyCheckIns.length)
  } else {
    this.averageWeeklyCheckIns = 0
  }
  
  // Reset last check-in
  this.lastCheckIn = null
  
  await this.save()
}

const User = mongoose.model('User', userSchema)

module.exports = User

// Reference schema kept for documentation
/*
const userSchemaReference = {
  "user_id": "uuid",
  "telegram_id": "123456789",
  "user_hash": "hashed_uuid",
  "wallet_address": "string (nullable)", 
  "proof_of_passport_id": "string (hashed)",
  "name": "string",
  "nickname": "string (anonymous check-in identifier)",
  "points": 100,
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
*/