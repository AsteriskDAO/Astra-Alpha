const HealthData = require('../models/healthData')
const akave = require('../services/akave')
const cache = require('../services/cache')

class HealthDataController {
  async updateProfile(req, res) {
    try {
      const { profile, research_opt_in } = req.body
      
      // Save to MongoDB using internal ID
      const healthData = await HealthData.findOneAndUpdate(
        { user_hash: req.user.id },
        { 
          $set: { 
            profile,
            research_opt_in,
            timestamp: new Date()
          }
        },
        { new: true, upsert: true }
      )

      // Save to Akave using hashed ID only
      const akaveResult = await akave.uploadData(healthData.user_hash, {
        profile,
        research_opt_in,
        timestamp: new Date().toISOString()
      }, 'user-profile')

      // Invalidate cache
      await cache.del(cache.generateKey('health', healthData.user_hash))

      res.json({ 
        ...healthData.toObject(),
        akave_key: akaveResult.key 
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      res.status(500).json({ error: 'Failed to update profile' })
    }
  }

  async updateHealthCondition(req, res) {
    try {
      const condition = req.body
      
      // Save to MongoDB using internal ID
      const healthData = await HealthData.findOneAndUpdate(
        { user_hash: req.user.id },
        { 
          $push: { disease_states: condition },
          $set: { timestamp: new Date() }
        },
        { new: true, upsert: true }
      )

      // Save to Akave using hashed ID only
      const akaveResult = await akave.uploadData(healthData.user_hash, {
        ...condition,
        timestamp: new Date().toISOString()
      }, 'health-condition')

      // Invalidate cache
      await cache.del(cache.generateKey('health', healthData.user_hash))

      res.json({
        disease_states: healthData.disease_states,
        akave_key: akaveResult.key
      })
    } catch (error) {
      console.error('Failed to update health condition:', error)
      res.status(500).json({ error: 'Failed to update health condition' })
    }
  }

  async getUserHealthConditions(req, res) {
    try {
      const cacheKey = cache.generateKey('health', req.params.userId)
      const cachedData = await cache.get(cacheKey)
      
      if (cachedData) {
        return res.json(cachedData)
      }

      // Get from MongoDB first (faster)
      const healthData = await HealthData.findOne({ user_hash: req.params.userId })
      
      if (healthData) {
        await cache.set(cacheKey, healthData.disease_states)
        return res.json(healthData.disease_states)
      }

      // Fallback to Akave using hashed ID
      const conditions = await akave.listUserData(healthData.user_hash, 'health-condition')
      await cache.set(cacheKey, conditions)
      res.json(conditions)
    } catch (error) {
      console.error('Failed to get health conditions:', error)
      res.status(500).json({ error: 'Failed to get health conditions' })
    }
  }
}

module.exports = new HealthDataController() 