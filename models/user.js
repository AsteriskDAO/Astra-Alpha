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

// Helper to compare weeks (same week start date)
function isSameWeek(date1, date2) {
  return getStartOfWeek(date1).getTime() === getStartOfWeek(date2).getTime()
}

// Method to record a check-in and update averages
userSchema.methods.recordCheckIn = async function() {
  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  
  // Find current week's record using proper date comparison
  let weekRecord = this.weeklyCheckIns.find(w => isSameWeek(w.week, startOfWeek))
  
  if (!weekRecord) {
    weekRecord = { week: startOfWeek, count: 0 }
    this.weeklyCheckIns.push(weekRecord)
  }
  
  // Increment counts
  weekRecord.count++
  this.checkIns++
  this.lastCheckIn = now
  this.points += 1
  
  // Clean up old weeks - keep only last 4 weeks
  const fourWeeksAgo = new Date(startOfWeek.getTime() - (4 * 7 * 24 * 60 * 60 * 1000))
  this.weeklyCheckIns = this.weeklyCheckIns
    .filter(w => w.week >= fourWeeksAgo)
    .sort((a, b) => b.week - a.week)
  
  // Calculate average based on number of week records we have
  const totalCheckins = this.weeklyCheckIns.reduce((sum, week) => sum + week.count, 0)
  const numberOfWeeks = this.weeklyCheckIns.length
  
  // Average = total checkins / number of weeks (minimum 1 week)
  this.averageWeeklyCheckIns = Math.round(totalCheckins / Math.max(1, numberOfWeeks))
  
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
  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  
  // Find current week's record using proper date comparison (same as recordCheckIn)
  let weekRecord = this.weeklyCheckIns.find(w => isSameWeek(w.week, startOfWeek))
  
  // Only decrement if week record exists and has counts (opposite of recordCheckIn which creates if not exists)
  if (weekRecord && weekRecord.count > 0) {
    weekRecord.count--
  }
  
  // Decrement counts (opposite of recordCheckIn increment)
  this.checkIns = Math.max(0, this.checkIns - 1)
  this.lastCheckIn = null
  this.points = Math.max(0, this.points - 1)
  
  // Clean up old weeks - keep only last 4 weeks (exactly same as recordCheckIn)
  const fourWeeksAgo = new Date(startOfWeek.getTime() - (4 * 7 * 24 * 60 * 60 * 1000))
  this.weeklyCheckIns = this.weeklyCheckIns
    .filter(w => w.week >= fourWeeksAgo)
    .sort((a, b) => b.week - a.week)
  
  // Calculate average based on number of week records we have (exactly same as recordCheckIn)
  const totalCheckins = this.weeklyCheckIns.reduce((sum, week) => sum + week.count, 0)
  const numberOfWeeks = this.weeklyCheckIns.length
  
  // Average = total checkins / number of weeks (minimum 1 week) (exactly same as recordCheckIn)
  this.averageWeeklyCheckIns = Math.round(totalCheckins / Math.max(1, numberOfWeeks))
  
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