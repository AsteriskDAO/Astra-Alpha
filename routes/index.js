const userRoutes = require('./user');
const checkInRoutes = require('./checkIn');
const vanaRoutes = require('./vana');

// Add route logging middleware
const routeLogger = (req, res, next) => {
  const start = Date.now()
  
  // Log when request starts
  console.log(`🚀 ${req.method} ${req.originalUrl}`)
  if (Object.keys(req.params).length) {
    console.log('Route params:', req.params)
  }
  if (Object.keys(req.query).length) {
    console.log('Query params:', req.query)
  }
  if (req.body && Object.keys(req.body).length) {
    console.log('Request body:', req.body)
  }

  // Log when request completes
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`✨ ${req.method} ${req.originalUrl} completed with status ${res.statusCode} in ${duration}ms\n`)
  })

  next()
}

module.exports = (app) => {
  // Add logging middleware before routes
  app.use(routeLogger)

  app.use('/api/users', userRoutes);
  app.use('/api/checkins', checkInRoutes);
  app.use('/api/vana', vanaRoutes);
};


