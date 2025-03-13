const akave = require('../services/akave')
const cache = require('../services/cache')
const User = require('../models/user')

class CheckInController {
  async createCheckin(req, res) {
    try {
      const { userId } = req.params
      
      // Find user to get hashed ID
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const checkInData = {
        user_hash: user.user_hash, // Use hashed ID for storage
        ...req.body,
        timestamp: new Date().toISOString()
      }

      // Store in Akave using hashed ID
      const result = await akave.uploadData(user.user_hash, checkInData, 'daily-checkin')
      
      // Invalidate checkins cache
      await cache.del(cache.generateKey('checkins', user.user_hash))
      
      res.json(result)
    } catch (error) {
      console.error('Failed to create check-in:', error)
      res.status(500).json({ error: 'Failed to create check-in' })
    }
  }

  async getUserCheckins(req, res) {
    try {
      const { userId } = req.params
      const { start, end } = req.query

      // Find user to get hashed ID
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      const cacheKey = cache.generateKey('checkins', `${user.user_hash}:${start}:${end}`)
      const cachedData = await cache.get(cacheKey)
      
      if (cachedData) {
        return res.json(cachedData)
      }
      
      const startDate = start ? parseInt(start) : Date.now() - (30 * 24 * 60 * 60 * 1000)
      const endDate = end ? parseInt(end) : Date.now()
      
      // Get from Akave using hashed ID
      const checkIns = await akave.getUserDataRange(user.user_hash, startDate, endDate, 'daily-checkin')
      await cache.set(cacheKey, checkIns)
      res.json(checkIns)
    } catch (error) {
      console.error('Failed to get check-ins:', error)
      res.status(500).json({ error: 'Failed to get check-ins' })
    }
  }

  async getCheckin(req, res) {
    try {
      const { key } = req.params
      const cacheKey = cache.generateKey('checkin', key)
      const cachedData = await cache.get(cacheKey)
      
      if (cachedData) {
        return res.json(cachedData)
      }
      
      const checkIn = await akave.getData(key)
      await cache.set(cacheKey, checkIn)
      res.json(checkIn)
    } catch (error) {
      console.error('Failed to get check-in:', error)
      res.status(500).json({ error: 'Failed to get check-in' })
    }
  }
}

module.exports = new CheckInController() 