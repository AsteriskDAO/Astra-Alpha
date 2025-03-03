const akave = require('../services/akave');

class AkaveController {
  // Get user's check-in history
  async getUserCheckins(req, res) {
    try {
      const { userId } = req.params;
      const { start, end } = req.query;
      
      const startDate = start ? parseInt(start) : Date.now() - (30 * 24 * 60 * 60 * 1000);
      const endDate = end ? parseInt(end) : Date.now();
      
      const checkIns = await akave.getUserDataRange(userId, startDate, endDate);
      res.json(checkIns);
    } catch (error) {
      console.error('Failed to get check-ins:', error);
      res.status(500).json({ error: 'Failed to get check-ins' });
    }
  }

  // Get specific check-in
  async getCheckin(req, res) {
    try {
      const { key } = req.params;
      const checkIn = await akave.getData(key);
      res.json(checkIn);
    } catch (error) {
      console.error('Failed to get check-in:', error);
      res.status(500).json({ error: 'Failed to get check-in' });
    }
  }

  // Get upload URL for media
  async getMediaUploadUrl(req, res) {
    try {
      const { userId } = req.params;
      const uploadUrl = await akave.getUploadUrl(userId, 'media');
      res.json({ uploadUrl });
    } catch (error) {
      console.error('Failed to get upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  }
}

module.exports = new AkaveController();
