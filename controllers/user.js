const User = require('../models/user')

class UserController {
  async registerUser(req, res) {
    try {
      const { telegramId, ...userData } = req.body
      const user = await User.createUser({
        telegram_id: telegramId,
        ...userData
      })
      res.json({
        user_hash: user.user_hash,
        nickname: user.nickname
      })
    } catch (error) {
      console.error('Failed to register user:', error)
      res.status(500).json({ error: 'Failed to register user' })
    }
  }

  async getUser(req, res) {
    try {
      const user = await User.findOne({ user_hash: req.params.userHash })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      res.json({
        nickname: user.nickname,
        points: user.points
      })
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

  async updateNickname(req, res) {
    try {
      const user = await User.findOneAndUpdate(
        { user_hash: req.params.userHash },
        { 
          $set: { 
            nickname: req.body.nickname,
            updated_at: new Date()
          }
        },
        { new: true }
      )
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json({
        nickname: user.nickname,
        updated_at: user.updated_at
      })
    } catch (error) {
      console.error('Failed to update nickname:', error)
      res.status(500).json({ error: 'Failed to update nickname' })
    }
  }
}

module.exports = new UserController() 