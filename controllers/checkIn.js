const CheckIn = require('../models/checkIn')
const User = require('../models/user')
const akave = require('../services/akave')
const cache = require('../services/cache')
const vana = require('../services/vana')

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

      // Record check-in and get updated average
      const averageWeeklyCheckIns = await user.recordCheckIn()

      // Store to O3 for data analysis
      const o3Response = await akave.uploadCheckinData(user_hash, checkIn)

      // upload o3 url to vana
      const vanaResponse = await vana.handleFileUpload(o3Response.url)

      if (vanaResponse) {
        console.log('vanaResponse', vanaResponse)
      }

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