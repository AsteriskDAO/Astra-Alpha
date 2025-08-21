const Queue = require('bull')
// const { bot } = require('../bots/tgBot')
const User = require('../models/user')
const DataUnion = require('../models/dataUnion')
const CheckIn = require('../models/checkIn')
const HealthData = require('../models/healthData')
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

/**
 * Ensures error messages are always strings for DataUnion compatibility
 * @param {*} errorMessage - The error message to sanitize
 * @returns {string} - A string error message
 */
function sanitizeErrorMessage(errorMessage) {
  if (errorMessage === null || errorMessage === undefined) {
    return null;
  }
  
  if (typeof errorMessage === 'string') {
    return errorMessage;
  }
  
  if (typeof errorMessage === 'object') {
    return JSON.stringify(errorMessage);
  }
  
  return String(errorMessage);
}

// Process queue items with concurrency control
uploadQueue.process(1, async (job) => {
  const { type, data, telegramId, user_hash } = job.data
  const results = {}
  let dataUnionRecord = null

  console.log("**********************************************************\n")
  console.log("**********************************************************\n")
  console.log("job.data", job.data);
  console.log("**********************************************************\n")
  console.log("**********************************************************\n")

  try {
    // Create or find DataUnion record for tracking
    const dataType = type === QUEUE_TYPES.CHECKIN ? 'checkin' : 'health'
    const dataId = type === QUEUE_TYPES.CHECKIN ? data.checkinId : data.healthDataId
    
    dataUnionRecord = await DataUnion.findByDataReference(user_hash, dataType, dataId)
    
    if (!dataUnionRecord) {
      // Create new DataUnion record
      dataUnionRecord = await DataUnion.createDataUnion({
        user_hash,
        data_type: dataType,
        data_id: dataId
      })
    }

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
        o3Response = await akave.uploadCheckinData(user_hash, data, signature)
      } else {
        o3Response = await akave.uploadHealthData(user_hash, data, signature)
      }

      if (!o3Response?.url) {
        // Update DataUnion with Akave failure
        await dataUnionRecord.updatePartnerSync('akave', false, sanitizeErrorMessage('Failed to get O3 upload URL'), { signature })
        throw new Error('Failed to get O3 upload URL')
      }
      
      // Store successful Akave upload in job data for potential retries
      job.data.o3Response = o3Response;
      job.data.signature = signature;
      await job.update(job.data);
      
      // Update DataUnion with Akave success
      await dataUnionRecord.updatePartnerSync('akave', true, null, { signature, o3Response })
      
      results.akave = o3Response
      // console.log("o3Response", o3Response);
    }

    // Check if we have a previous Vana upload state
    let vanaState = job.data.vanaState;
    
    // Reconstruct buffers from hex if present in state
    if (vanaState && vanaState.fixed_iv && vanaState.fixed_ephemeral_key) {
		  vanaState.fixed_iv_buffer = Buffer.from(vanaState.fixed_iv, 'hex')
		  vanaState.fixed_ephemeral_key_buffer = Buffer.from(vanaState.fixed_ephemeral_key, 'hex')
    }
    
    // Then upload to Vana with same signature
    const vanaResponse = await vana.handleFileUpload(o3Response.url, job.data.signature, type, vanaState, job.attemptsMade);

    // If upload not complete or has error, store state and retry
    if (!vanaResponse?.status) {
      console.log("Full vanaResponse:", JSON.stringify(vanaResponse, null, 2));
      console.log("vanaResponse.status:", vanaResponse?.status);
      
      // Persist only the inner state for accurate resume (whitelisted fields, no buffers)
      // Handle case where state might be missing or have different structure
      let serializedState = {};
      
      // Extract state properties from vanaResponse (they're directly on the object, not nested)
      const { fileId, fixed_iv, fixed_ephemeral_key, file_registered, contribution_proof_requested, jobDetails, tee_proof_submitted, data_refined, reward_claimed, status } = vanaResponse || {};
      
      serializedState = { 
        fileId, 
        fixed_iv, 
        fixed_ephemeral_key, 
        file_registered, 
        contribution_proof_requested, 
        jobDetails, 
        tee_proof_submitted, 
        data_refined, 
        reward_claimed,
        status
      };
      
      console.log("Serialized state:", serializedState);
      
      job.data.vanaState = serializedState;
      await job.update(job.data);
      
      // Update DataUnion with Vana failure and retry data
      const errorMessage = sanitizeErrorMessage(vanaResponse.message || 'Vana upload in progress');
      const errorDetails = vanaResponse.error ? JSON.stringify(vanaResponse.error) : null;
      
      console.log("Vana error message (sanitized):", errorMessage);
      console.log("Vana error details:", errorDetails);
      
      await dataUnionRecord.updatePartnerSync('vana', false, errorMessage, { 
        vanaState: serializedState,
        error: errorDetails,
        message: vanaResponse.message
      })
      
      console.log("vanaResponse.error", vanaResponse.error);
      console.log("vanaResponse.message", vanaResponse.message);
      
      // Create error object with state information
      let errorMsg = 'Vana upload in progress';
      if (vanaResponse?.message) {
        if (typeof vanaResponse.message === 'string') {
          errorMsg = vanaResponse.message;
        } else {
          errorMsg = JSON.stringify(vanaResponse.message);
        }
      }
      
      const error = new Error(errorMsg);
      error.state = serializedState;
      throw error;
    }
    
    // Update DataUnion with Vana success
    await dataUnionRecord.updatePartnerSync('vana', true, null, { vanaResponse })
    
    results.vana = vanaResponse;
    console.log("vanaResponse", vanaResponse);

    // Send success message
    const successMsg = type === QUEUE_TYPES.CHECKIN 
      ? '✅ Your check-in has been successfully recorded and processed!'
      : '✅ Your health profile has been successfully updated and processed!'
    
    // await sendTelegramMessage(telegramId, successMsg)
    job.moveToCompleted()
    return results

  } catch (error) {
    console.error(`Upload failed for ${type}:`, error)

    // On final attempt, handle failure
    await handleFailure(job, dataUnionRecord)
    throw error;
  }
})

async function handleFailure(job, dataUnionRecord) {
  const { type, telegramId, user_hash } = job.data
  console.log("job.attemptsMade", job.attemptsMade);
  console.log("job.opts.attempts", job.opts.attempts);
  if (job.attemptsMade >= job.opts.attempts - 1) {
    if (type === QUEUE_TYPES.CHECKIN) {
      // Rollback check-in
      // const user = await User.findOne({ user_hash })
      // if (user) {
      //   await user.rollbackCheckIn()
      // }

      // Send failure message
      // await sendTelegramMessage(
      //   telegramId, 
      //   '❌ Sorry, there was an issue processing your check-in. Please try checking in again.'
      // )
    } else {
      // For health data, just notify of sync issue
      // await sendTelegramMessage(
      //   telegramId,
      //   '⚠️ Your health profile was saved but there was an issue syncing it. Please try updating it again.'
      // )
    }
    
    // Update DataUnion with final failure status if we have a record
    if (dataUnionRecord) {
      try {
        if (type === QUEUE_TYPES.CHECKIN) {
          await dataUnionRecord.updatePartnerSync('akave', false, sanitizeErrorMessage('Final attempt failed - check-in rolled back'))
          await dataUnionRecord.updatePartnerSync('vana', false, sanitizeErrorMessage('Final attempt failed - check-in rolled back'))
        } else {
          await dataUnionRecord.updatePartnerSync('akave', false, sanitizeErrorMessage('Final attempt failed - health data sync failed'))
          await dataUnionRecord.updatePartnerSync('vana', false, sanitizeErrorMessage('Final attempt failed - health data sync failed'))
        }
      } catch (updateError) {
        console.error('Failed to update DataUnion on final failure:', updateError)
      }
    }
    
    job.moveToFailed({
      message: 'Upload failed',
      failedReason: 'Upload failed'
    })
  }
}

// Add to queue
async function addToQueue(type, data, telegramId, user_hash, extraJobData = {}) {
	return uploadQueue.add({
		type,
		data,
		telegramId,
		user_hash,
		...extraJobData
	})
}

// Utility function to retry failed syncs
async function retryFailedSyncs(partner, dataType = null) {
	const failedSyncs = await DataUnion.findFailedSyncs(partner, dataType)
	
	for (const failedSync of failedSyncs) {
		// Find the original data to retry
		let originalData
		if (failedSync.data_type === 'checkin') {
			originalData = await CheckIn.findOne({ checkinId: failedSync.data_id })
		} else {
			originalData = await HealthData.findOne({ healthDataId: failedSync.data_id })
		}
		
		if (originalData) {
			// Build extras from stored retry data so the job can resume
			const extras = {}
			const akaveRetry = failedSync.partners?.akave?.retry_data || null
			const vanaRetry = failedSync.partners?.vana?.retry_data || null
			if (akaveRetry) {
				if (akaveRetry.o3Response) extras.o3Response = akaveRetry.o3Response
				if (akaveRetry.signature) extras.signature = akaveRetry.signature
			}
			if (vanaRetry && vanaRetry.vanaState) {
				extras.vanaState = vanaRetry.vanaState
			}
			
			// Add back to queue for retry with extras
			await addToQueue(
				failedSync.data_type === 'checkin' ? QUEUE_TYPES.CHECKIN : QUEUE_TYPES.HEALTH,
				originalData,
				null, // We don't have telegramId here, but the queue can handle it
				failedSync.user_hash,
				extras
			)
		}
	}
	
	return failedSyncs.length
}

// Utility function to get sync statistics
async function getSyncStats() {
	const totalRecords = await DataUnion.countDocuments()
	const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true })
	const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true })
	const akaveFailed = await DataUnion.countDocuments({ 'partners.akave.is_synced': false })
	const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false })
	
	return {
		total: totalRecords,
		akave: { success: akaveSuccess, failed: akaveFailed, successRate: totalRecords > 0 ? (akaveSuccess / totalRecords) * 100 : 0 },
		vana: { success: vanaSuccess, failed: vanaFailed, successRate: totalRecords > 0 ? (vanaSuccess / totalRecords) * 100 : 0 }
	}
}

module.exports = {
	addToQueue,
	QUEUE_TYPES,
	retryFailedSyncs,
	getSyncStats
} 