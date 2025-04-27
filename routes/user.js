const express = require('express')
const router = express.Router()
const userController = require('../controllers/user')
const { validateTelegramWebApp } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')

// Registration
router.post('/register', 
  validateTelegramWebApp, 
  validateRequest('registerUser'), 
  userController.registerUser
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
router.put('/verify-gender', 
  userController.verifyGender
)

module.exports = router 