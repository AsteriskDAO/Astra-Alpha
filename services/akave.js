// Need SDK
// Use amazon s3 sdk
// then replace api url with akave s3 url

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { v4: uuidv4 } = require('uuid')

class AkaveService {
  constructor() {
    // TODO: S3 setup will go here later
    // this.s3Client = new S3Client({
    //   region: process.env.AWS_REGION,
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    //   }
    // });
    // this.bucketName = process.env.AWS_BUCKET_NAME;
  }

  // Upload data to Akave storage
  async uploadData(userId, data, type = 'daily-checkin') {
    const key = `${type}/${userId}/${Date.now()}.json`
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
      })

      await this.s3Client.send(command)
      return { 
        success: true, 
        key,
        ...data 
      }
    } catch (error) {
      console.error('Akave upload error:', error)
      throw new Error('Failed to upload data')
    }
  }

  // Get data from Akave storage
  async getData(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      const response = await this.s3Client.send(command)
      const data = await response.Body.transformToString()
      return {
        key,
        ...JSON.parse(data)
      }
    } catch (error) {
      console.error('Akave get error:', error)
      throw new Error('Failed to get data')
    }
  }

  // List user's data
  async listUserData(userId, type = 'daily-checkin') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${type}/${userId}/`
      })

      const response = await this.s3Client.send(command)
      const dataPromises = (response.Contents || []).map(obj => 
        this.getData(obj.Key)
      )
      return Promise.all(dataPromises)
    } catch (error) {
      console.error('Akave list error:', error)
      throw new Error('Failed to list data')
    }
  }

  // Get user's data for date range
  async getUserDataRange(userId, startDate, endDate, type = 'daily-checkin') {
    try {
      const files = await this.listUserData(userId, type)
      return files.filter(file => {
        const timestamp = parseInt(file.key.split('/').pop().split('.')[0])
        return timestamp >= startDate && timestamp <= endDate
      })
    } catch (error) {
      console.error('Data range error:', error)
      throw new Error('Failed to get data range')
    }
  }

  // Generate presigned URL for direct upload
  async getUploadUrl(userId, type = 'daily-checkin') {
    const key = `${type}/${userId}/${Date.now()}.json`
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: 'application/json'
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 })
    } catch (error) {
      console.error('Presigned URL error:', error)
      throw new Error('Failed to generate upload URL')
    }
  }

  async checkUserExists(userId) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `users/${userId}/`,
        MaxKeys: 1
      });

      const response = await this.s3Client.send(command);
      return response.Contents && response.Contents.length > 0;
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw new Error('Failed to check user registration');
    }
  }

  // TODO: Potentially remove everything above this

  /**
   * Store data to O3 (mock implementation for testing)
   * @param {string} userId - User's hashed ID
   * @param {Object} data - Data to store
   * @returns {Promise<{key: string}>} - Storage key/location
   */
  async storeToO3(userId, data) {
    try {
      // Generate a mock key
      const key = `${userId}/${uuidv4()}.json`;
      
      // Log the data for testing
      console.log('Mock O3 Storage:', {
        key,
        userId,
        data,
        timestamp: new Date().toISOString()
      });
      
      return { key };
    } catch (error) {
      console.error('Failed to store data to O3:', error);
      throw new Error('Failed to store data');
    }
  }
}

module.exports = new AkaveService()

// upload file 

// read file