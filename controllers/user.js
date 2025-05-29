const User = require('../models/user')
const HealthData = require('../models/healthData')
const akave = require('../services/akave')
const cache = require('../services/cache')
const { addToQueue, QUEUE_TYPES } = require('../services/queue')
const { verifyProof } = require('../services/self')

class UserController {
  /**
   * Create new user or return existing
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with user data
   * @dev Checks for existing user by telegram ID
   */
  async createUser(req, res) {

    // console.log('registerUser', req.body)
    console.log('createUser')
    try {

      // check if user already exists
      let user = await User.findOne({ telegram_id: req.body.telegramId })
      if (user) {
        return res.status(200).json({
          user: user,
          isRegistered: user.isRegistered,
          isGenderVerified: user.isGenderVerified,
          message: 'User already exists'
        })
      }

      const { telegramId, ...userData } = req.body
      user = await User.createUser({
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

  /**
   * Update user points with a specific amount
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with updated points
   * @dev Not currently implemented
   */

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

  /**
   * Get user by telegram ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with user data
   * @dev Returns user data including health data
   */
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

  /**
   * Update user data
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with updated user data
   * @dev Updates user data including health data
   */
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
      )

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let updatedHealthData = await HealthData.findOneAndUpdate(
        { user_hash: user.user_hash }, 
        { $set: healthData }, 
        { new: true }
      )      

      if (!updatedHealthData) {
        healthData.user_hash = user.user_hash
        updatedHealthData = await HealthData.createHealthData(healthData)
      }

      // Queue the uploads
      await addToQueue(
        QUEUE_TYPES.HEALTH,
        healthData,
        user.telegram_id,
        user.user_hash
      )

      const response = {
        ...user._doc,
        isRegistered: true,
        healthData: updatedHealthData
      }

      res.json(response)
    } catch (error) {
      console.error('Failed to update user:', error)
      res.status(500).json({ error: 'Failed to update user' })
    }
  }

  /**
   * Verify user gender
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with verification status
   * @dev Not currently implemented
   */

  // TODO: Implement gender verification with Self.xyz
  async verifyGender(req, res) {
    console.log('verifyGender')
    console.log(req.body)
    try {
      const { proof, publicSignals } = req.body
      const { result, userId } = await verifyProof(proof, publicSignals)
      if (!result) {
        return res.status(400).json({ error: 'Proof verification failed' })
      }



      if (result.isValid && result.credentialSubject.gender === 'M') {
        // Find and update user by user_id instead of _id
        
        const user = await User.findOneAndUpdate(
          { user_id: userId },
          { $set: { isGenderVerified: true } },
          { new: true }
        )
        if(!user) throw new Error('User not found')
        // Return successful verification response
        return res.status(200).json({
          status: 'success',
          result: true,
          credentialSubject: result.credentialSubject
        });
      } else {
        // Return failed verification response
        return res.status(500).json({
          status: 'error',
          result: false,
          message: 'Verification failed',
          details: result.isValidDetails
        });
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return res.status(500).json({
        status: 'error',
        result: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

module.exports = new UserController() 