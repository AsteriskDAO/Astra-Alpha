// Need SDK
// Use amazon s3 sdk
// then replace api url with akave s3 url

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { v4: uuidv4 } = require('uuid')
const { serverSideEncrypt, jsonToFile } = require('../utils/crypto')
const { ethers } = require('ethers')

// Debug environment variables
console.log('Environment Variables:', {
  endpoint: process.env.AKAVE_ENDPOINT,
  region: process.env.AKAVE_REGION,
  accessKeyId: process.env.AKAVE_ACCESS_KEY,
  secretKey: process.env.AKAVE_SECRET_KEY,
  healthBucket: process.env.AKAVE_BUCKET_NAME_HEALTH_TEST,
  checkinBucket: process.env.AKAVE_BUCKET_NAME_CHECKIN_TEST
})

// Verify environment variables are loaded
if (!process.env.AKAVE_ENDPOINT || !process.env.AKAVE_REGION || 
    !process.env.AKAVE_ACCESS_KEY || !process.env.AKAVE_SECRET_KEY) {
  throw new Error('Missing required Akave environment variables')
}

// Create S3 client
const s3Client = new S3Client({
  endpoint: process.env.AKAVE_ENDPOINT,
  region: process.env.AKAVE_REGION,
  credentials: {
    accessKeyId: process.env.AKAVE_ACCESS_KEY,
    secretAccessKey: process.env.AKAVE_SECRET_KEY
  },
  forcePathStyle: true
})

async function checkS3Client() {
  console.log(await s3Client.config.endpoint())
  console.log(await s3Client.config.region())
  console.log(await s3Client.config.credentials())
}

checkS3Client()

// Bucket names
const BUCKETS = {
  HEALTH: process.env.AKAVE_BUCKET_NAME_HEALTH_TEST,
  CHECKIN: process.env.AKAVE_BUCKET_NAME_CHECKIN_TEST
}

// Verify buckets are configured
if (!BUCKETS.HEALTH || !BUCKETS.CHECKIN) {
  throw new Error('Missing required bucket names in environment variables')
}

const encryptData = async (data, signature) => {
  const encryptedData = await serverSideEncrypt(data, signature)
  return encryptedData
}

/**
 * Upload health data to O3 storage
 * @param {string} userId - User's ID
 * @param {Object} data - Health data to store
 * @param {string} signature - Signature for encryption
 * @returns {Promise<{key: string, success: boolean}>}
 */
async function uploadHealthData(userId, data, signature) {
  const key = `health/${userId}/${Date.now()}.json`
  try {
    // Convert JSON to File before encryption
    const jsonFile = jsonToFile(data);
    const encryptedFile = await serverSideEncrypt(jsonFile, signature);
    
    console.log('Uploading health data to O3 storage:', {
      userId,
      key,
      bucket: BUCKETS.HEALTH
    })

    console.log('Data to upload:', data)
    console.log('Encrypted data:', encryptedFile)
    
    const command = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKETS.HEALTH,
        Key: key,
        Body: encryptedFile,
        ContentType: 'application/octet-stream' // Match the File type
      }
    })

    await command.done()

    const url = await getDataUrl(BUCKETS.HEALTH, key)
    console.log('Health data uploaded to O3 storage:', {
      key,
      url
    })
    return { 
      success: true, 
      key,
      url
    }
  } catch (error) {
    console.error('Failed to upload health data:', error)
    throw error;
  }
}

/**
 * Upload check-in data to O3 storage
 * @param {string} userId - User's ID
 * @param {Object} data - Check-in data to store
 * @param {string} signature - Signature for encryption
 * @returns {Promise<{key: string, success: boolean}>}
 */
async function uploadCheckinData(userId, data, signature) {
  const key = `checkin/${userId}/${Date.now()}.json`
  try {
    // Convert JSON to File before encryption
    const jsonFile = jsonToFile(data);
    const encryptedFile = await serverSideEncrypt(jsonFile, signature);
    
    console.log('Uploading check-in data to O3 storage:', {
      userId,
      key,
      bucket: BUCKETS.CHECKIN
    })

    console.log('Data to upload:', data)
    console.log('Encrypted data:', encryptedFile)

    // const arrayBuffer = await encryptedFile.arrayBuffer();
    // const uint8Array = new Uint8Array(arrayBuffer);
    
    const command = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKETS.CHECKIN,
        Key: key,
        Body: encryptedFile,
        ContentType: 'application/octet-stream',
      }
    })

    await command.done()
    
    const url = await getDataUrl(BUCKETS.CHECKIN, key)  
    console.log('Check-in data uploaded to O3 storage:', {
      key,
      url
    })
    return { 
      success: true, 
      key,
      url
    }
  } catch (error) {
    console.error('Failed to upload check-in data:', error)
    throw error;
  }
}

/**
 * Get user's health data
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} - Array of health data objects
 */
async function getHealthData(userId) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKETS.HEALTH,
      Prefix: `health/${userId}/`
    })

    const response = await s3Client.send(command)
    const dataPromises = (response.Contents || []).map(obj => 
      getData(BUCKETS.HEALTH, obj.Key)
    )
    return Promise.all(dataPromises)
  } catch (error) {
    console.error('Get health data error:', error)
    throw new Error('Failed to get health data')
  }
}

/**
 * Get user's check-in data
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} - Array of check-in data objects
 */
async function getCheckinData(userId) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKETS.CHECKIN,
      Prefix: `checkin/${userId}/`
    })

    const response = await s3Client.send(command)
    const dataPromises = (response.Contents || []).map(obj => 
      getData(BUCKETS.CHECKIN, obj.Key)
    )
    return Promise.all(dataPromises)
  } catch (error) {
    console.error('Get check-in data error:', error)
    throw new Error('Failed to get check-in data')
  }
}

/**
 * Helper method to get data from a specific bucket and key
 * @private
 */
async function getData(bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const response = await s3Client.send(command)
    const data = await response.Body.transformToString()
    return {
      key,
      ...JSON.parse(data)
    }
  } catch (error) {
    console.error('Get data error:', error)
    throw new Error('Failed to get data')
  }
}

async function getDataUrl(bucket, key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })

  const url = await getSignedUrl(s3Client, command)
  return url
}

module.exports = {
  uploadHealthData,
  uploadCheckinData,
  getHealthData,
  getCheckinData
}

// upload file 

// read file