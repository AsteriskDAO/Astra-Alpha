const cors = require('cors')

// Development origins - you'll want to update these for production
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',
  'https://t.me', // Telegram domains
  'https://web.telegram.org'
]

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.telegram.org')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data']
}

module.exports = cors(corsOptions) 