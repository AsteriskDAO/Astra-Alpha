const crypto = require('crypto')

const validateTelegramWebApp = (req, res, next) => {
  console.log('validateTelegramWebApp')
  try {
    const initData = req.headers['x-telegram-init-data']
    
    if (!initData) {
      console.error('Missing Telegram init data')
      return res.status(401).json({ error: 'Missing Telegram init data' })
    }

    // Parse the init data
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash') // Remove hash from data before checking

    // Generate the data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    console.log('Data check string:', dataCheckString)

    // Create HMAC-SHA256
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TG_BOT_API_KEY)
      .digest()

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    console.log('Received hash:', hash)
    console.log('Calculated hash:', calculatedHash)

    if (hash !== calculatedHash) {
      console.error('Invalid hash')
      return res.status(401).json({ error: 'Invalid authentication' })
    }

    // Get user data from init data
    const user = JSON.parse(urlParams.get('user') || '{}')
    req.user = user
    next()
  } catch (error) {
    console.error('Auth validation failed:', error)
    res.status(401).json({ error: 'Invalid authentication' })
  }
}

module.exports = { validateTelegramWebApp } 