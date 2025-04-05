const cors = require('cors')

// Development origins - you'll want to update these for production
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',
  'https://t.me', // Telegram domains
  'https://web.telegram.org'
]

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-telegram-init-data'],
  credentials: true
}

module.exports = cors(corsOptions) 