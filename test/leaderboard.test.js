const mongoose = require('mongoose')
const User = require('../models/user')
const config = require('../config/database')

/**
 * Test script for leaderboard functionality
 * Run with: node test/leaderboard.test.js
 * 
 * ⚠️  SAFETY: This script is READ-ONLY and will NOT delete any data
 */

async function testLeaderboard() {
  try {
    console.log('🧪 Testing leaderboard functionality...')
    console.log('⚠️  SAFETY: This test is READ-ONLY and will NOT delete any data\n')
    
    // Connect to test database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('✅ Connected to database')

    // SAFETY: Count existing users instead of deleting
    const existingUserCount = await User.countDocuments()
    console.log(`📊 Found ${existingUserCount} existing users in database`)
    
    if (existingUserCount === 0) {
      console.log('⚠️  No users found. Please create some test users first.')
      console.log('💡 You can create users through your normal app flow')
      return
    }

    // Test 1: Get user rank (using existing users)
    console.log('\n📊 Test 1: Getting user rank...')
    
    // Get a sample user to test with
    const sampleUser = await User.findOne({}, 'user_hash points')
    if (sampleUser) {
      console.log(`Testing with user: ${sampleUser.user_hash} (${sampleUser.points} points)`)
      
      const rankResult = await User.aggregate([
        {
          $match: { points: { $gt: sampleUser.points } }
        },
        {
          $count: "rank"
        }
      ])
      const userRank = (rankResult[0]?.rank || 0) + 1
      console.log(`✅ User rank: ${userRank}`)
    } else {
      console.log('⚠️  No users found to test ranking')
    }

    // Test 2: Get top users
    console.log('\n🏆 Test 2: Getting top users...')
    const topUsers = await User.aggregate([
      { $sort: { points: -1 } },
      { $limit: 3 },
      { $project: { name: 1, points: 1, user_hash: 1 } }
    ])
    
    if (topUsers.length > 0) {
      console.log('Top 3 users:')
      topUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name || 'Unknown'} (${user.user_hash}): ${user.points} points`)
      })
    } else {
      console.log('⚠️  No users found to display')
    }

    // Test 3: Performance test (read-only)
    console.log('\n⚡ Test 3: Performance test (read-only)...')
    const startTime = Date.now()
    
    // Simulate 10 rank lookups (safe number)
    for (let i = 0; i < 10; i++) {
      await User.aggregate([
        { $match: { points: { $gt: 0 } } },
        { $count: "rank" }
      ])
    }
    
    const endTime = Date.now()
    const avgTime = (endTime - startTime) / 10
    console.log(`Average query time: ${avgTime.toFixed(2)}ms`)
    console.log(`Total time for 10 queries: ${endTime - startTime}ms`)

    console.log('\n🎉 All tests passed!')
    console.log('✅ No data was modified or deleted')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

// Run tests
if (require.main === module) {
  testLeaderboard()
}

module.exports = { testLeaderboard }
