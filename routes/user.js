const express = require('express')
const router = express.Router()
const userController = require('../controllers/user')
const { validateTelegramWebApp } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')

// Registration
router.post('/create', 
  validateTelegramWebApp, 
  validateRequest('createUser'), 
  userController.createUser
)

// Get user data
router.get('/telegram/:telegramId', 
  validateTelegramWebApp, 
  userController.getUserByTelegramId
)

// Update user data (includes both user and health data)
router.put('/update', 
  validateTelegramWebApp, 
  validateRequest('updateUser'), 
  userController.updateUser
)

// Get user by hash (for internal use)
router.get('/:userHash', 
  validateTelegramWebApp, 
  userController.getUser
)

// Update points (for internal use)
router.put('/:userHash/points', 
  validateTelegramWebApp, 
  validateRequest('updatePoints'), 
  userController.updatePoints
)

// Update gender verification status
router.post('/verify-gender', 
  userController.verifyGender
)

// Submit voucher code
router.post('/submit-voucher-code', 
  userController.submitVoucherCode
)

// Admin endpoints for sync management
router.get('/admin/sync-stats', userController.getSyncStats)
router.post('/admin/retry-failed-syncs', userController.retryFailedSyncs)

// Leaderboard endpoints
router.get('/:userHash/rank', 
  validateTelegramWebApp, 
  userController.getUserRank
)

router.get('/leaderboard/top', 
  validateTelegramWebApp, 
  userController.getTopUsers
)

module.exports = router 