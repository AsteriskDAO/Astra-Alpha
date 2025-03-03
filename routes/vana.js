const express = require('express');
const router = express.Router();
const vanaController = require('../controllers/vana');

// Upload file to Vana network
router.post('/upload/:userId', vanaController.handleFileUpload);

module.exports = router; 