const validateTelegramWebApp = (req, res, next) => {
  try {
    // Get telegram init data from header
    const initData = req.headers['x-telegram-init-data']
    if (!initData) {
      return res.status(401).json({ error: 'No Telegram init data provided' })
    }

    // Validate init data hash
    // TODO: Add proper telegram hash validation
    // For now, just check if data exists
    if (!initData.includes('user')) {
      return res.status(401).json({ error: 'Invalid Telegram init data' })
    }

    // Parse user data and add to request
    const userData = JSON.parse(decodeURIComponent(initData))
    req.user = userData.user
    next()
  } catch (error) {
    console.error('Auth validation failed:', error)
    res.status(401).json({ error: 'Invalid authentication' })
  }
}

module.exports = { validateTelegramWebApp } 