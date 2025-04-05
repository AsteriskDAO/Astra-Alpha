const express = require('express')
const router = express.Router()
const checkInController = require('../controllers/checkIn')
const { validateTelegramWebApp } = require('../middleware/auth')
const { validateRequest } = require('../middleware/validation')

// TODO: update routes as needed

router.post('/:user_hash', 
  validateTelegramWebApp,
  validateRequest('checkIn'),
  checkInController.createCheckin
)
router.get('/:userId', validateTelegramWebApp, checkInController.getUserCheckins)

module.exports = router 