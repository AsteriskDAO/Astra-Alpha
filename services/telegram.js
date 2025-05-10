const { Bot } = require("grammy")
const TG_BOT_API_KEY = process.env.TG_BOT_API_KEY

// Create a singleton bot instance
const bot = new Bot(TG_BOT_API_KEY)

async function sendTelegramMessage(telegramId, message) {
  try {
    await bot.api.sendMessage(telegramId, message)
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
  }
}

module.exports = {
  bot,
  sendTelegramMessage
} 