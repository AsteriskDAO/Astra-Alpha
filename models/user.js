const mongoose = require('mongoose')
const { createUserHash } = require('../utils/hash')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')

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
  updated_at: { type: Date, default: Date.now }
})

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updated_at = new Date()
  next()
})

// Static method to create a new user with proper hashing
userSchema.statics.createUser = async function(userData) {
  const newUserId = uuidv4()
  const userHash = createUserHash(newUserId)
  
  const user = new this({
    user_id: newUserId,
    telegram_id: userData.telegram_id,
    user_hash: userHash,
    proof_of_passport_id: userData.proof_of_passport_id ? 
      bcrypt.hashSync(userData.proof_of_passport_id, 10) : undefined,
    name: userData.name,
    nickname: userData.nickname,
    points: userData.points || 0
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