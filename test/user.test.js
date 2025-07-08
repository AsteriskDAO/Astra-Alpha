const mongoose = require('mongoose')
const User = require('../models/user')
const { expect } = require('chai')
require('dotenv').config()

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
})

after(async () => {
  await mongoose.connection.close()
})

describe('User Model Weekly Check-in Tests', () => {
  let user

  beforeEach(async () => {
    // Clear the users collection before each test
    // await User.deleteMany({})
    
    // Create a new user for each test
    user = await User.createUser({
      telegram_id: '123456',
      name: 'Test User',
      nickname: 'testuser'
    })
  })

  afterEach(async () => {
    if (user && user._id) {
      await User.deleteOne({ _id: user._id })
    }
  })

  it('should calculate correct average for single week check-ins', async () => {
    // Record 3 check-ins in the same week
    await user.recordCheckIn()
    await user.recordCheckIn()
    await user.recordCheckIn()

    // console.log('user.averageWeeklyCheckIns', user.averageWeeklyCheckIns)
    // console.log('user.weeklyCheckIns', user.weeklyCheckIns)
    // console.log('user', user)
    
    // Average should be 3
    expect(user.averageWeeklyCheckIns).to.equal(3)
  })

  it('should calculate correct average for multiple weeks', async () => {
    // Record 2 check-ins in first week
    await user.recordCheckIn()
    await user.recordCheckIn()
    
    // Move to next week
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    user.weeklyCheckIns[0].week = nextWeek
    
    // Record 4 check-ins in second week
    await user.recordCheckIn()
    await user.recordCheckIn()
    await user.recordCheckIn()
    await user.recordCheckIn()
    
    // Average should be 3 ((2 + 4) / 2)
    expect(user.averageWeeklyCheckIns).to.equal(3)
  })

  it('should handle rollback correctly', async () => {
    // Record 3 check-ins
    await user.recordCheckIn()
    await user.recordCheckIn()
    await user.recordCheckIn()
    
    // Rollback one check-in
    await user.rollbackCheckIn()
    
    // Average should be 2
    expect(user.averageWeeklyCheckIns).to.equal(2)
  })

  it('should maintain 4-week window', async () => {
    // Create 5 weeks of data
    for (let i = 0; i < 5; i++) {
      const weekDate = new Date()
      weekDate.setDate(weekDate.getDate() - (i * 7))
      user.weeklyCheckIns.push({
        week: weekDate,
        count: 2
      })
    }
    
    // Record a new check-in
    await user.recordCheckIn()
    
    // Should only keep 4 weeks
    expect(user.weeklyCheckIns.length).to.equal(4)
  })

  it('should handle edge case of no check-ins', async () => {
    // User starts with no check-ins
    expect(user.averageWeeklyCheckIns).to.equal(0)
    
    // Record one check-in
    await user.recordCheckIn()
    expect(user.averageWeeklyCheckIns).to.equal(1)
    
    // Rollback the check-in
    await user.rollbackCheckIn()
    expect(user.averageWeeklyCheckIns).to.equal(0)
  })
}) 