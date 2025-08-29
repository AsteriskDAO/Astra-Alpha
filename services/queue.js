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

/**
 * Handles Vana upload failure or incomplete state
 * @param {Object} vanaResponse - Response from Vana service
 * @param {Object} dataUnionRecord - DataUnion record to update
 * @param {Object} job - Bull job object
 * @returns {Object} - Serialized state for retry
 */
async function handleVanaFailure(vanaResponse, dataUnionRecord, job) {
  if (vanaResponse?.error) {
    console.log("❌ Vana upload failed with error");
  } else {
    console.log("⚠️ Vana upload incomplete - storing state for retry");
  }
  
  console.log("Full vanaResponse:", JSON.stringify(serializeBigInts(vanaResponse), null, 2));
  console.log("vanaResponse.state.status:", vanaResponse?.state?.status);
  
  // Store state in job for retry
  job.data.vanaState = vanaResponse?.state || {};
  await job.update(job.data);
  
  // Update DataUnion with failure details
  const errorMessage = sanitizeErrorMessage(vanaResponse.message || 'Vana upload in progress');
  const errorDetails = vanaResponse.error ? JSON.stringify(vanaResponse.error) : null;
  
  console.log("Vana error message (sanitized):", errorMessage);
  console.log("Vana error details:", errorDetails);
  
  await dataUnionRecord.updatePartnerSync('vana', false, errorMessage, { 
    vanaState: vanaResponse?.state || {},
    error: errorDetails,
    message: vanaResponse.message,
    file_id: vanaResponse.fileId || null
  });
  
  // Create error object with state information
  const error = new Error(errorMessage);
  error.state = vanaResponse?.state || {};
  throw error;
}

/**
 * Handles Vana upload success
 * @param {Object} vanaResponse - Response from Vana service
 * @param {Object} dataUnionRecord - DataUnion record to update
 * @returns {Object} - Serialized state for storage
 */
async function handleVanaSuccess(vanaResponse, dataUnionRecord) {
  console.log("✅ Vana upload successful");
  console.log("  fileId:", vanaResponse.state?.fileId);
  console.log("  status:", vanaResponse.state?.status);
  
  // Update DataUnion with success
  await dataUnionRecord.updatePartnerSync('vana', true, null, { 
    fileId: vanaResponse.state?.fileId,
    vanaState: vanaResponse.state || {},
    vanaResponse,
    file_id: vanaResponse.state?.fileId || null
  });
  
  return vanaResponse.state || {};
}

/**
 * Handles Akave upload
 * @param {Object} data - Data to upload
 * @param {string} type - Data type (checkin/health)
 * @param {string} user_hash - User hash
 * @param {Object} dataUnionRecord - DataUnion record to update
 * @param {Object} job - Bull job object
 * @returns {Object} - Akave response
 */
async function handleAkaveUpload(data, type, user_hash, dataUnionRecord, job) {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const provider = new ethers.JsonRpcProvider("https://rpc.moksha.vana.org");
  const wallet = new ethers.Wallet(privateKey, provider);
  const signature = await wallet.signMessage("Please sign to retrieve your encryption key");

  // Upload to Akave with signature
  let o3Response;
  if (type === QUEUE_TYPES.CHECKIN) {
    o3Response = await akave.uploadCheckinData(user_hash, data, signature);
  } else {
    o3Response = await akave.uploadHealthData(user_hash, data, signature);
  }

  if (!o3Response?.url) {
    // Update DataUnion with Akave failure
    await dataUnionRecord.updatePartnerSync('akave', false, sanitizeErrorMessage('Failed to get O3 upload URL'), { signature });
    throw new Error('Failed to get O3 upload URL');
  }
  
  // Store successful Akave upload in job data for potential retries
  job.data.o3Response = o3Response;
  job.data.signature = signature;
  await job.update(job.data);
  
  // Update DataUnion with Akave success
  await dataUnionRecord.updatePartnerSync('akave', true, null, { 
    signature, 
    o3Response,
    key: o3Response.key,
    url: o3Response.url,
    akaveResponse: o3Response
  });
  
  return o3Response;
}

// Process queue items with concurrency control
uploadQueue.process(1, async (job) => {
  const { type, data, telegramId, user_hash } = job.data;
  const results = {};
  let dataUnionRecord = null;

  try {
    // Create or find DataUnion record for tracking
    const dataType = type === QUEUE_TYPES.CHECKIN ? 'checkin' : 'health';
    const dataId = type === QUEUE_TYPES.CHECKIN ? data.checkinId : data.healthDataId;
    
    dataUnionRecord = await DataUnion.findByDataReference(user_hash, dataType, dataId);
    
    if (!dataUnionRecord) {
      dataUnionRecord = await DataUnion.createDataUnion({
        user_hash,
        data_type: dataType,
        data_id: dataId
      });
    }

    // Handle Akave upload (if not already done)
    let o3Response = job.data.o3Response;
    if (!o3Response) {
      o3Response = await handleAkaveUpload(data, type, user_hash, dataUnionRecord, job);
      results.akave = o3Response;
    }

    // Handle Vana upload
    const vanaResponse = await vana.handleFileUpload(o3Response.url, job.data.signature, type, job.data.vanaState, job.attemptsMade);

    // Check Vana upload status and handle accordingly
    if (!vanaResponse?.state?.status || vanaResponse?.error) {
      await handleVanaFailure(vanaResponse, dataUnionRecord, job);
    } else {
      await handleVanaSuccess(vanaResponse, dataUnionRecord);
    }
    
    results.vana = vanaResponse;

    // Send success message
    const successMsg = type === QUEUE_TYPES.CHECKIN 
      ? '✅ Your check-in has been successfully recorded and processed!'
      : '✅ Your health profile has been successfully updated and processed!';
    
    // await sendTelegramMessage(telegramId, successMsg)
    job.moveToCompleted();
    return results;

  } catch (error) {
    console.error(`Upload failed for ${type}:`, error);
    await handleFailure(job, dataUnionRecord);
    throw error;
  }
});

async function handleFailure(job, dataUnionRecord) {
  const { type, user_hash } = job.data;
  
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
    
    // Update DataUnion with final failure status
    if (dataUnionRecord) {
      try {
        const failureMessage = type === QUEUE_TYPES.CHECKIN 
          ? 'Final attempt failed - check-in rolled back'
          : 'Final attempt failed - health data sync failed';
        
        await dataUnionRecord.updatePartnerSync('akave', false, sanitizeErrorMessage(failureMessage));
        await dataUnionRecord.updatePartnerSync('vana', false, sanitizeErrorMessage(failureMessage));
      } catch (updateError) {
        console.error('Failed to update DataUnion on final failure:', updateError);
      }
    }
    
    job.moveToFailed({
      message: 'Upload failed',
      failedReason: 'Upload failed'
    });
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
  });
}

// Utility function to retry failed syncs
async function retryFailedSyncs(partner, dataType = null) {
  try {
    const failedSyncs = await DataUnion.findFailedSyncs(partner, dataType);
    console.log(`Found ${failedSyncs.length} failed syncs for ${partner}${dataType ? ` (${dataType})` : ''}`);
    
    for (const failedSync of failedSyncs) {
      try {
        // Find the original data to retry
        let originalData;
        if (failedSync.data_type === 'checkin') {
          originalData = await CheckIn.findOne({ checkinId: failedSync.data_id });
        } else {
          originalData = await HealthData.findOne({ healthDataId: failedSync.data_id });
        }
        
        if (!originalData) {
          console.warn(`Original data not found for ${failedSync.data_type} ${failedSync.data_id}`);
          continue;
        }
        
        // Build extras from stored retry data so the job can resume
        const extras = buildRetryExtras(failedSync);
        
        // Add back to queue for retry with extras
        await addToQueue(
          failedSync.data_type === 'checkin' ? QUEUE_TYPES.CHECKIN : QUEUE_TYPES.HEALTH,
          originalData,
          null, // We don't have telegramId here, but the queue can handle it
          failedSync.user_hash,
          extras
        );
        
        console.log(`✅ Queued retry for ${failedSync.data_type} ${failedSync.data_id}`);
      } catch (syncError) {
        console.error(`Failed to retry sync for ${failedSync.data_type} ${failedSync.data_id}:`, syncError);
      }
    }
    
    return failedSyncs.length;
  } catch (error) {
    console.error(`Failed to retry failed syncs for ${partner}:`, error);
    throw error;
  }
}

/**
 * Builds retry extras from stored retry data
 * @param {Object} failedSync - Failed sync record
 * @returns {Object} - Extras object for retry
 */
function buildRetryExtras(failedSync) {
  const extras = {};
  const akaveRetry = failedSync.partners?.akave?.retry_data || null;
  const vanaRetry = failedSync.partners?.vana?.retry_data || null;
  
  if (akaveRetry) {
    if (akaveRetry.o3Response) extras.o3Response = akaveRetry.o3Response;
    if (akaveRetry.signature) extras.signature = akaveRetry.signature;
  }
  
  if (vanaRetry && vanaRetry.vanaState) {
    extras.vanaState = vanaRetry.vanaState;
  }
  
  return extras;
}

// Utility function to get sync statistics
async function getSyncStats() {
  try {
    const totalRecords = await DataUnion.countDocuments();
    const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    const akaveFailed = await DataUnion.countDocuments({ 'partners.akave.is_synced': false });
    const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false });
    
    return {
      total: totalRecords,
      akave: { 
        success: akaveSuccess, 
        failed: akaveFailed, 
        successRate: totalRecords > 0 ? (akaveSuccess / totalRecords) * 100 : 0 
      },
      vana: { 
        success: vanaSuccess, 
        failed: vanaFailed, 
        successRate: totalRecords > 0 ? (vanaSuccess / totalRecords) * 100 : 0 
      }
    };
  } catch (error) {
    console.error('Failed to get sync statistics:', error);
    throw error;
  }
}

module.exports = {
	addToQueue,
	QUEUE_TYPES,
	retryFailedSyncs,
	getSyncStats
} 