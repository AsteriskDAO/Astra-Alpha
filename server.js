// express server
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const port = 3000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://013b-188-129-81-104.ngrok-free.app', // Add your ngrok URL
    /\.ngrok-free\.app$/, // Allow any ngrok-free.app subdomain
    /\.loca\.lt$/, // Allow any loca.lt subdomain
    /\.onrender\.com$/ // Allow any onrender.com subdomain
  ],
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

// Apply CORS middleware
app.use(cors(corsOptions));

app.use(express.json());

require('./routes')(app);

require('./bots/tgBot');  

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

