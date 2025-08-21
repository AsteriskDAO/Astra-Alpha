const express = require('express');
const dotenv = require('dotenv');
// Fly.io handles secrets differently, so we need to use a different approach
// const path = require('path');
// dotenv.config({
//   path: path.resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`)
// });
dotenv.config();
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config/config');
const logger = require('./utils/logger');
const leader = require('./services/leader');
const { setupBot } = require('./bots/tgBot');
const { leaderEvents } = require('./services/events');

// Initialize leader election and bot
const initializeServices = async () => {
  try {
    await leader.initialize();
    await setupBot();
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Don't throw here - we want the server to stay up even if bot fails
    // But maybe add some retry logic
    setTimeout(initializeServices, 5000);
  }
};

// Connect to MongoDB
// connectDB();

const app = express();

// CORS configuration based on environment
const corsOptions = {
  origin: [/\.onrender\.com$/, /\.fly\.dev$/],
    // ?  // Production domains including fly.io
    // : ['http://localhost:5173'], // Development domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'x-telegram-init-data',
    'x-telegram-auth'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(express.json());

require('./routes')(app);

// Make sure we wait for MongoDB before starting services
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB()
    logger.info('MongoDB connected')

    // Initialize leader election
    await leader.initialize()
    logger.info('Leader election initialized')

    // Listen for leader events
    leaderEvents.on('newLeader', async () => {
      try {
        await setupBot()
        logger.info('Bot setup completed')
      } catch (error) {
        logger.error('Failed to setup bot:', error)
      }
    })
    
    // Start Express server
    app.listen(config.server.port, () => {
      logger.info(`Server started in ${config.server.env} mode on port ${config.server.port}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}
console.log('Running test single upload')
// run script to test single upload
const { testSingleUpload } = require('./scripts/test-single-upload');
testSingleUpload();

startServer().catch(error => {
  logger.error('Fatal error during startup:', error)
  process.exit(1)
})