const express = require('express');
const router = express.Router();
const akaveController = require('../controllers/akave');

// Get user's check-in history
router.get('/checkins/:userId', akaveController.getUserCheckins);

// Get specific check-in
router.get('/checkin/:key', akaveController.getCheckin);

// Get upload URL for media
router.post('/checkin/:userId/media', akaveController.getMediaUploadUrl);

module.exports = router;
