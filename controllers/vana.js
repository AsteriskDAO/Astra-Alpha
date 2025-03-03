const vana = require('../services/vana');

class VanaController {
  // Handle file upload to Vana network
  async handleFileUpload(req, res) {
    try {
      const { userId } = req.params;
      const { file, privateKey } = req.body;
      
      const result = await vana.handleFileUpload(file, privateKey);
      res.json(result);
    } catch (error) {
      console.error('Failed to upload to Vana:', error);
      res.status(500).json({ error: 'Failed to upload to Vana network' });
    }
  }
}

module.exports = new VanaController(); 