const express = require('express')
const router = express.Router()
const checkInController = require('../controllers/checkIn')
const { validateTelegramWebApp } = require('../middleware/auth')

router.post('/:userId', validateTelegramWebApp, checkInController.createCheckin)
router.get('/:userId', validateTelegramWebApp, checkInController.getUserCheckins)
router.get('/single/:key', validateTelegramWebApp, checkInController.getCheckin)

module.exports = router 