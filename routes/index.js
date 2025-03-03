const akaveRoutes = require('./akave');
const vanaRoutes = require('./vana');

module.exports = (app) => {
  app.use('/api/storage', akaveRoutes);  // S3 storage related routes
  app.use('/api/vana', vanaRoutes);      // Vana network routes
};


