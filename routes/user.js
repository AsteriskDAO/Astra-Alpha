const express = require('express')
const router = express.Router()
const userController = require('../controllers/user')
const { validateTelegramWebApp } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')

// User registration and management
router.post('/register', validateTelegramWebApp, userController.registerUser)
router.get('/:userHash', validateTelegramWebApp, userController.getUser)
router.put('/:userHash/points', validateTelegramWebApp, userController.updatePoints)
router.put('/:userHash/nickname', 
  validateTelegramWebApp,
  validateRequest('updateNickname'),
  userController.updateNickname
)

module.exports = router 