const { Bot, session } = require("grammy")
const logger = require('../utils/logger')
const leader = require('./leader')

let bot = null

const initBot = async () => {
  try {
    // Only initialize bot if not already initialized
    if (!bot) {
      logger.info('Initializing new bot instance')
      bot = new Bot(process.env.TG_BOT_API_KEY)
    }
    return bot
  } catch (error) {
    logger.error('Bot initialization error:', error)
    throw error
  }
}

const sendTelegramMessage = async (chatId, message) => {
  try {
    if (!bot) {
      await initBot()
    }
    await bot.api.sendMessage(chatId, message)
  } catch (error) {
    logger.error('Failed to send Telegram message:', error)
    throw error
  }
}

module.exports = {
  initBot,
  session,
  sendTelegramMessage,
  getBot: () => bot
} 