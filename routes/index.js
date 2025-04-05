const userRoutes = require('./user');
const checkInRoutes = require('./checkIn');
const vanaRoutes = require('./vana');

module.exports = (app) => {
  app.use('/api/users', userRoutes);
  app.use('/api/checkins', checkInRoutes);
  app.use('/api/vana', vanaRoutes);
};


