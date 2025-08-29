const User = require('../models/user')
const HealthData = require('../models/healthData')
const Notification = require('../models/notification')
const DataUnion = require('../models/dataUnion')
const akave = require('../services/akave')
const cache = require('../services/cache')
const { addToQueue, QUEUE_TYPES } = require('../services/queue')
const { verifyProof } = require('../services/self')
const CheckIn = require('../models/checkIn')

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
      
      // Fetch current health data using the reference
      let healthData = null
      if (user.currentHealthDataId) {
        healthData = await HealthData.findOne({ healthDataId: user.currentHealthDataId })
      } else {
        // if no current health data, get the latest health data
        healthData = await HealthData.findOne({ user_hash: user.user_hash }).sort({ timestamp: -1 })
      }
      
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

      // Fetch current health data using the reference
      let healthData = null
      if (user.currentHealthDataId) {
        healthData = await HealthData.findOne({ healthDataId: user.currentHealthDataId })
      } else {
        // if no current health data, get the latest health data
        healthData = await HealthData.findOne({ user_hash: user.user_hash }).sort({ timestamp: -1 })
      }
      
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

      // Update user in MongoDB first to get user object
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

      // Create new health data record (instead of updating existing)
      healthData.user_hash = user.user_hash
      healthData.timestamp = new Date()
      const newHealthData = await HealthData.createHealthData(healthData)

      // Update user with reference to current health data
      await User.findOneAndUpdate(
        { telegram_id: userData.telegramId },
        { 
          $set: {
            currentHealthDataId: newHealthData.healthDataId,
            updated_at: new Date()
          }
        }
      )

      // add notification for the user if they don't have one yet
      const notification = await Notification.findOne({ user_id: user.telegram_id })
      if (!notification) {
        await Notification.createNotification(user.telegram_id)
      }
      
      // Queue the uploads
      await addToQueue(
        QUEUE_TYPES.HEALTH,
        newHealthData.toObject(),
        user.telegram_id,
        user.user_hash
      )

      const response = {
        ...user._doc,
        currentHealthDataId: newHealthData.healthDataId,
        isRegistered: true,
        healthData: newHealthData
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
      const { attestationId, proof, publicSignals, userContextData } = req.body
      
      if (!attestationId || !proof || !publicSignals || !userContextData) {
        return res.status(400).json({ 
          error: 'Missing required parameters: attestationId, proof, publicSignals, userContextData' 
        })
      }

      const result = await verifyProof(attestationId, proof, publicSignals, userContextData)
      
      if (!result.isValid) {
        return res.status(400).json({ 
          error: 'Proof verification failed',
          details: result.isValidDetails 
        })
      }

      // Check if gender is female
      if (result.credentialSubject.gender === 'F') {
        // Find and update user by user_id from userData
        const user = await User.findOneAndUpdate(
          { user_id: result.userData.userIdentifier },
          { $set: { isGenderVerified: true } },
          { new: true }
        )
        
        if(!user) {
          throw new Error('User not found')
        }
        
        // Return successful verification response
        return res.status(200).json({
          status: 'success',
          result: true,
          credentialSubject: result.credentialSubject,
          userData: result.userData
        });
      } else {
        // Return failed verification response
        return res.status(400).json({
          status: 'error',
          result: false,
          message: 'Verification completed, but gender must be female',
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

  async submitVoucherCode(req, res) {
    const { telegramId, voucherCode } = req.body
    const user = await User.findOne({ telegram_id: telegramId })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
  
    const validateVoucherCode = process.env.VOUCHER_CODE;
    if (voucherCode === validateVoucherCode) {
      user.isGenderVerified = true
      await user.save()
      return res.status(200).json({ success: true })
    } else {
      return res.status(400).json({ error: 'Invalid voucher code' })
    }
  }

  // Admin method to get sync statistics
  async getSyncStats(req, res) {
    try {
      const totalRecords = await DataUnion.countDocuments()
      const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true })
      const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true })
      const akaveFailed = await DataUnion.countDocuments({ 'partners.akave.is_synced': false })
      const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false })
      
      const stats = {
        total: totalRecords,
        akave: { 
          success: akaveSuccess, 
          failed: akaveFailed, 
          successRate: totalRecords > 0 ? Math.round((akaveSuccess / totalRecords) * 100) : 0 
        },
        vana: { 
          success: vanaSuccess, 
          failed: vanaFailed, 
          successRate: totalRecords > 0 ? Math.round((vanaSuccess / totalRecords) * 100) : 0 
        }
      }
      
      res.json(stats)
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      res.status(500).json({ error: 'Failed to get sync stats' })
    }
  }

  // Admin method to retry failed syncs
  async retryFailedSyncs(req, res) {
    try {
      const { partner, dataType } = req.body
      
      if (!partner || !['akave', 'vana'].includes(partner)) {
        return res.status(400).json({ error: 'Invalid partner. Must be "akave" or "vana"' })
      }
      
      const retryCount = await require('../services/queue').retryFailedSyncs(partner, dataType)
      
      res.json({ 
        message: `Added ${retryCount} failed syncs back to queue for retry`,
        totalFailed: retryCount,
        retryCount
      })
    } catch (error) {
      console.error('Failed to retry failed syncs:', error)
      res.status(500).json({ error: 'Failed to retry failed syncs' })
    }
  }

  /**
   * Get user's rank based on points
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with user rank
   */
  async getUserRank(req, res) {
    try {
      const { userHash } = req.params
      
      // Get user's points first
      const user = await User.findOne({ user_hash: userHash }, 'points')
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Count users with more points (this gives us the rank)
      // Using aggregation for better performance
      const rankResult = await User.aggregate([
        {
          $match: {
            points: { $gt: user.points }
          }
        },
        {
          $count: "rank"
        }
      ])

      // Rank is count + 1 (since we're counting users ABOVE this user)
      const rank = (rankResult[0]?.rank || 0) + 1
      
      res.json({
        userHash,
        points: user.points,
        rank,
        totalUsers: await User.countDocuments()
      })
    } catch (error) {
      console.error('Failed to get user rank:', error)
      res.status(500).json({ error: 'Failed to get user rank' })
    }
  }

  /**
   * Get top N users for leaderboard display
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with top users
   */
  async getTopUsers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10
      const offset = parseInt(req.query.offset) || 0
      
      // Validate limits to prevent abuse
      if (limit > 100) {
        return res.status(400).json({ error: 'Limit cannot exceed 100' })
      }
      if (offset > 1000) {
        return res.status(400).json({ error: 'Offset cannot exceed 1000' })
      }

      // Get top users with pagination
      const topUsers = await User.aggregate([
        {
          $sort: { points: -1 }
        },
        {
          $skip: offset
        },
        {
          $limit: limit
        },
        {
          $project: {
            user_hash: 1,
            name: 1,
            nickname: 1,
            points: 1,
            checkIns: 1,
            averageWeeklyCheckIns: 1
          }
        }
      ])

      // Get total count for pagination info
      const totalUsers = await User.countDocuments()

      res.json({
        users: topUsers,
        pagination: {
          limit,
          offset,
          total: totalUsers,
          hasMore: offset + limit < totalUsers
        }
      })
    } catch (error) {
      console.error('Failed to get top users:', error)
      res.status(500).json({ error: 'Failed to get top users' })
    }
  }
}

module.exports = new UserController() 