const User = require('../models/user')
const HealthData = require('../models/healthData')
const akave = require('../services/akave')
const cache = require('../services/cache')

// TODO: Double check logic for updating points and checkIns

class UserController {
  async createUser(req, res) {

    // console.log('registerUser', req.body)
    console.log('createUser')
    try {
      const { telegramId, ...userData } = req.body
      const user = await User.createUser({
        telegram_id: telegramId,
        isRegistered: false,
        isGenderVerified: false
      })

      const response = {
        ...user._doc,
        isRegistered: false,
        isGenderVerified: false
      }
      console.log('user')
      console.log(response)
      res.json(response)
    } catch (error) {
      console.error('Failed to create user:', error)
      res.status(500).json({ error: 'Failed to create user' })
    }
  }

  async getUser(req, res) {
    try {
      const user = await User.findOne({ user_hash: req.params.userHash })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      const healthData = await HealthData.findOne({ user_hash: user.user_hash })
      const response = {
        ...user._doc,
        isRegistered: true,
        healthData: healthData
      }
      res.json(response)
    } catch (error) {
      console.error('Failed to get user:', error)
      res.status(500).json({ error: 'Failed to get user' })
    }
  }

  async updatePoints(req, res) {
    try {
      const user = await User.findOneAndUpdate(
        { user_hash: req.params.userHash },
        { $inc: { points: req.body.points } },
        { new: true }
      )
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      res.json({ points: user.points })
    } catch (error) {
      console.error('Failed to update points:', error)
      res.status(500).json({ error: 'Failed to update points' })
    }
  }

  async getUserByTelegramId(req, res) {
    try {
      const user = await User.findOne({ telegram_id: req.params.telegramId })
      
      // If user doesn't exist, return a specific response
      if (!user) {
        return res.json({
          isRegistered: false,
          message: 'User not found'
        })
      }

      const healthData = await HealthData.findOne({ user_hash: user.user_hash })
      const response = {
        ...user._doc,
        healthData: healthData
      }
      // If user exists, return their data
      res.json(response)
    } catch (error) {
      console.error('Failed to get user:', error)
      res.status(500).json({ error: 'Failed to get user' })
    }
  }

  async updateUser(req, res) {
    try {
      const userData = req.body
      const healthData = userData.healthData

      // Update user in MongoDB
      const user = await User.findOneAndUpdate(
        { telegram_id: userData.telegramId },
        { 
          $set: {
            ...userData,
            updated_at: new Date()
          }
        },
        { new: true }
      );

      const updatedHealthData = await HealthData.findOneAndUpdate(
        { user_hash: user.user_hash }, 
        { $set: healthData }, 
        { new: true }
      )

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Store to O3
      // const akaveResult = await akave.storeToO3(user.user_hash, {
      //   healthData
      // });

      // Invalidate cache
      // await cache.del(cache.generateKey('user', user.user_hash));
      // await cache.del(cache.generateKey('health', user.user_hash));

      const response = {
        ...user._doc,
        isRegistered: true,
        healthData: updatedHealthData
      }
      console.log('user')
      console.log(response)

      // Return combined data
      res.json(response);
    } catch (error) {
      console.error('Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async verifyGender(req, res) {
    console.log('verifyGender')
    console.log(req.body)
  //   try {
  //     const { userHash, isGenderVerified } = req.body
  //     const user = await User.findOneAndUpdate(
  //       { user_hash: userHash },
  //       { $set: { isGenderVerified } },
  //       { new: true }
  //     )
  //     if (!user) {
  //       return res.status(404).json({ error: 'User not found' })
  //     }
  //     res.json({ message: 'Gender verified successfully' })
  //   } catch (error) {
  //     console.error('Failed to verify gender:', error)
  //     res.status(500).json({ error: 'Failed to verify gender' })
  //   }
  // }
  }
}



module.exports = new UserController() 