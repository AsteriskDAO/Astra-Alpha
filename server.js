const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config/config');
const logger = require('./utils/logger');



// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration based on environment
const corsOptions = {
  origin: config.server.env === 'production' 
    ? [/\.onrender\.com$/] // Production domains
    : ['http://localhost:5173'], // Development domains
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
require('./bots/tgBot');  

app.listen(config.server.port, () => {
    logger.info(`Server started in ${config.server.env} mode on port ${config.server.port}`);
});