const validateTelegramWebApp = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data']
  if (!initData) {
    return res.status(401).json({ error: 'No Telegram WebApp data' })
  }

  try {
    const data = JSON.parse(decodeURIComponent(initData))
    req.user = {
      id: data.user.id.toString(),
      initData: data
    }
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid WebApp data' })
  }
}

module.exports = { validateTelegramWebApp } 