const Queue = require('bull')
// const { bot } = require('../bots/tgBot')
const User = require('../models/user')
const akave = require('./akave')
const vana = require('./vana')
const { sendTelegramMessage } = require('./telegram')
const { ethers } = require('ethers')

// Create upload queue
const uploadQueue = new Queue('dataUpload', 
    process.env.REDIS_URL, 
    {
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          timeout: 180000, // 3 minutes timeout for jobs
          removeOnComplete: true, // Remove completed jobs
          removeOnFail: false // Keep failed jobs for debugging
        }
    }
)

const QUEUE_TYPES = {
  CHECKIN: 'checkin',
  HEALTH: 'health'
}

/**
 * Recursively converts BigInt values to strings in an object
 * @param {*} obj - The object to process
 * @returns {*} - The processed object with BigInt values converted to strings
 */
function serializeBigInts(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }

  return obj;
}

// Process queue items
uploadQueue.process(async (job) => {
  const { type, data, telegramId } = job.data
  const results = {}

  console.log("**********************************************************\n")
  console.log("**********************************************************\n")
  console.log("job.data", job.data);
  console.log("**********************************************************\n")
  console.log("**********************************************************\n")

  try {
    // Check if we already have an Akave upload from a previous attempt
    let o3Response = job.data.o3Response;
    
    if (!o3Response) {
      // Only do Akave upload if we don't have a previous successful upload
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY
      const provider = new ethers.JsonRpcProvider("https://rpc.moksha.vana.org")
      const wallet = new ethers.Wallet(privateKey, provider)
      const signature = await wallet.signMessage("Please sign to retrieve your encryption key")

      // First upload to Akave with signature
      if (type === QUEUE_TYPES.CHECKIN) {
        o3Response = await akave.uploadCheckinData(job.data.user_hash, data, signature)
      } else {
        o3Response = await akave.uploadHealthData(job.data.user_hash, data, signature)
      }

      if (!o3Response?.url) {
        throw new Error('Failed to get O3 upload URL')
      }
      
      // Store successful Akave upload in job data for potential retries
      job.data.o3Response = o3Response;
      job.data.signature = signature;
      await job.update(job.data);
      
      results.akave = o3Response
      // console.log("o3Response", o3Response);
    }

    // Check if we have a previous Vana upload state
    let vanaState = job.data.vanaState;
    
    // Then upload to Vana with same signature
    const vanaResponse = await vana.handleFileUpload(o3Response.url, job.data.signature, type, vanaState, job.attemptsMade);

    // If upload not complete or has error, store state and retry
    if (!vanaResponse?.state?.status) {
      // console.log("vanaResponse", vanaResponse);
      const serializedState = serializeBigInts(vanaResponse);
      job.data.vanaState = serializedState;
      await job.update(job.data);
      
      console.log("vanaResponse.error", vanaResponse.error);
      console.log("vanaResponse.message", vanaResponse.message);
      
      // Create error object with state information
      const error = new Error(vanaResponse.message || 'Vana upload in progress');
      error.state = serializedState;
      throw error;
    }
    
    results.vana = vanaResponse;
    console.log("vanaResponse", vanaResponse);

    // Send success message
    const successMsg = type === QUEUE_TYPES.CHECKIN 
      ? '✅ Your check-in has been successfully recorded and processed!'
      : '✅ Your health profile has been successfully updated and processed!'
    
    await sendTelegramMessage(telegramId, successMsg)
    job.moveToCompleted()
    return results

  } catch (error) {
    console.error(`Upload failed for ${type}:`, error)

    // On final attempt, handle failure
    await handleFailure(job)
    throw error;
  }
})

async function handleFailure(job) {
  const { type, telegramId, user_hash } = job.data
  console.log("job.attemptsMade", job.attemptsMade);
  console.log("job.opts.attempts", job.opts.attempts);
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
    job.moveToFailed({
      message: 'Upload failed',
      failedReason: 'Upload failed'
    })
  }
}

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