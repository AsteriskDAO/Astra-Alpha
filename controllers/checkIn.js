const CheckIn = require('../models/checkIn')
const User = require('../models/user')
const akave = require('../services/akave')
const cache = require('../services/cache')

class CheckInController {
  async createCheckin(req, res) {
    try {
      const { user_hash } = req.params

      // Create check-in in MongoDB
      const checkIn = await CheckIn.create({
        user_hash,
        ...req.body
      })

      // Update user's check-in count and points
      await User.findOneAndUpdate(
        { user_hash },
        { 
          $inc: { 
            checkIns: 1,
            points: 1 // Add one point per check-in
          }
        }
      )

      // Store to O3 for data analysis
      await akave.uploadCheckinData(user_hash, checkIn)

      res.json({
        success: true,
        checkIn: checkIn.toObject()
      })
    } catch (error) {
      console.error('Failed to create check-in:', error)
      res.status(500).json({ error: 'Failed to create check-in' })
    }
  }

  async getUserCheckins(req, res) {
    // TODO: Implement this for testing purposes
    try {
      const { user_hash } = req.params
      const checkIns = await CheckIn.find({ user_hash })
      res.json(checkIns)
    } catch (error) {
      console.error('Failed to get check-ins:', error)
    }
  }
}

module.exports = new CheckInController() 