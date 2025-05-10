const CheckIn = require('../models/checkIn')
const User = require('../models/user')
const akave = require('../services/akave')
const cache = require('../services/cache')
const vana = require('../services/vana')
const { addToQueue, QUEUE_TYPES } = require('../services/queue')

class CheckInController {
  async createCheckin(req, res) {
    try {
      const { user_hash } = req.params

      // Create check-in in MongoDB
      const checkIn = await CheckIn.create({
        user_hash,
        ...req.body
      })

      // Find user and record check-in
      const user = await User.findOne({ user_hash })
      if (!user) {
        throw new Error('User not found')
      }

      // Record check-in
      const averageWeeklyCheckIns = await user.recordCheckIn()

      // Queue the uploads
      await addToQueue(
        QUEUE_TYPES.CHECKIN,
        checkIn.toObject(),
        user.telegram_id,
        user_hash
      )

      res.json({
        success: true,
        checkIn: checkIn.toObject(),
        stats: {
          totalCheckIns: user.checkIns,
          averageWeeklyCheckIns
        }
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