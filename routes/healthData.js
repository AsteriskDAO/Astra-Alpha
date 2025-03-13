const express = require('express')
const router = express.Router()
const healthDataController = require('../controllers/healthData')
const { validateRequest } = require('../middleware/validation')
const { validateTelegramWebApp } = require('../middleware/auth')

router.put('/profile', 
  validateTelegramWebApp,
  validateRequest('profile'),
  healthDataController.updateProfile
)

router.post('/condition',
  validateTelegramWebApp,
  validateRequest('healthCondition'),
  healthDataController.updateHealthCondition
)

router.get('/conditions/:userId', 
  validateTelegramWebApp,
  healthDataController.getUserHealthConditions
)

module.exports = router 