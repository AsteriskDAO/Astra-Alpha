const Queue = require('bull')
// const { bot } = require('../bots/tgBot')
const User = require('../models/user')
const akave = require('./akave')
const vana = require('./vana')
const { sendTelegramMessage } = require('../bots/tgBot')

// Create upload queue
const uploadQueue = new Queue('dataUpload', 
    process.env.REDIS_URL, 
    {
        defaultJobOptions: {
        attempts: 3,
        backoff: {
        type: 'exponential',
        delay: 2000
    }
  }
})

const QUEUE_TYPES = {
  CHECKIN: 'checkin',
  HEALTH: 'health'
}

// Process queue items
uploadQueue.process(async (job) => {
  const { type, data, telegramId, user_hash } = job.data
  const results = {}
  console.log("job.data", job.data);

  try {
    let o3Response;
    // First upload to Akave
    if (type === QUEUE_TYPES.CHECKIN) {
      o3Response = await akave.uploadData(user_hash, data)
    } else {
      o3Response = await akave.uploadHealthData(user_hash, data)
    }

    if (!o3Response?.url) {
      throw new Error('Failed to get O3 upload URL')
    }
    results.akave = o3Response

    console.log("o3Response", o3Response);

    // Then upload to Vana
    const vanaResponse = await vana.handleFileUpload(o3Response.url)
    if (!vanaResponse?.uploadedFileId) {
      throw new Error('Failed to upload to Vana')
    }
    results.vana = vanaResponse

    console.log("vanaResponse", vanaResponse);

    // Send success message
    const successMsg = type === QUEUE_TYPES.CHECKIN 
      ? '✅ Your check-in has been successfully recorded and processed!'
      : '✅ Your health profile has been successfully updated and processed!'
    
    await sendTelegramMessage(telegramId, successMsg)
    return results

  } catch (error) {
    console.error(`Upload failed for ${type}:`, error)

    // On final attempt, handle failure
    if (job.attemptsMade >= job.opts.attempts - 1) {
      if (type === QUEUE_TYPES.CHECKIN) {
        // Rollback check-in
        const user = await User.findOne({ user_hash })
        if (user) {
          await user.rollbackCheckIn()
        }

        // Send failure message
        await sendTelegramMessage(
          telegramId, 
          '❌ Sorry, there was an issue processing your check-in. Please try checking in again.'
        )
      } else {
        // For health data, just notify of sync issue
        await sendTelegramMessage(
          telegramId,
          '⚠️ Your health profile was saved but there was an issue syncing it. Please try updating it again.'
        )
      }
    }
    throw error // Let Bull handle retry logic
  }
})

// Add to queue
async function addToQueue(type, data, telegramId, user_hash) {
  return uploadQueue.add({
    type,
    data,
    telegramId,
    user_hash
  })
}

module.exports = {
  addToQueue,
  QUEUE_TYPES
} 