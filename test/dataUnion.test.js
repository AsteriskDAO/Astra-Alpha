const mongoose = require('mongoose')
const DataUnion = require('../models/dataUnion')
const { expect } = require('chai')
require('dotenv').config()

// Set global timeout for all tests
const TIMEOUT = 30000 // 30 seconds

describe('DataUnion Model Tests', function() {
  this.timeout(TIMEOUT)

  let testDataUnion

  before(async function() {
    this.timeout(TIMEOUT)
    try {
      console.log('Connecting to MongoDB...')
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      console.log('MongoDB connected successfully')
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error)
      throw error
    }
  })

  after(async function() {
    this.timeout(TIMEOUT)
    try {
      await mongoose.connection.close()
      console.log('MongoDB connection closed')
    } catch (error) {
      console.error('Error closing MongoDB connection:', error)
    }
  })

  beforeEach(async function() {
    this.timeout(TIMEOUT)
    // Create a test DataUnion record before each test
    testDataUnion = await DataUnion.createDataUnion({
      user_hash: 'test_user_hash_123',
      data_type: 'health',
      data_id: 'test_health_data_id_456'
    })
  })

  afterEach(async function() {
    this.timeout(TIMEOUT)
    // Clean up after each test
    if (testDataUnion && testDataUnion._id) {
      await DataUnion.deleteOne({ _id: testDataUnion._id })
    }
  })

  describe('Schema and Creation', () => {
    it('should create DataUnion record with all required fields', () => {
      expect(testDataUnion).to.have.property('_id')
      expect(testDataUnion).to.have.property('user_hash', 'test_user_hash_123')
      expect(testDataUnion).to.have.property('data_type', 'health')
      expect(testDataUnion).to.have.property('data_id', 'test_health_data_id_456')
      expect(testDataUnion).to.have.property('partners')
      expect(testDataUnion).to.have.property('created_at')
      expect(testDataUnion).to.have.property('updated_at')
    })

    it('should have correct partner structure', () => {
      expect(testDataUnion.partners).to.have.property('akave')
      expect(testDataUnion.partners).to.have.property('vana')
      expect(testDataUnion.partners.akave).to.have.property('is_synced', false)
      expect(testDataUnion.partners.vana).to.have.property('is_synced', false)
    })

    it('should set default values correctly', () => {
      expect(testDataUnion.partners.akave.is_synced).to.be.false
      expect(testDataUnion.partners.vana.is_synced).to.be.false
      expect(testDataUnion.partners.akave.error_message).to.be.undefined
      expect(testDataUnion.partners.vana.error_message).to.be.undefined
    })

    it('should create timestamps automatically', () => {
      expect(testDataUnion.created_at).to.be.instanceOf(Date)
      expect(testDataUnion.updated_at).to.be.instanceOf(Date)
      expect(testDataUnion.created_at.getTime()).to.be.closeTo(Date.now(), 1000)
      expect(testDataUnion.updated_at.getTime()).to.be.closeTo(Date.now(), 1000)
    })
  })

  describe('Partner Sync Updates', () => {
    it('should update Akave sync status successfully', async () => {
      const retryData = { signature: 'test_sig_123', o3Response: { url: 'https://test.akave.url' } }
      
      await testDataUnion.updatePartnerSync('akave', true, null, retryData)
      
      expect(testDataUnion.partners.akave.is_synced).to.be.true
      expect(testDataUnion.partners.akave.error_message).to.be.null
      expect(testDataUnion.partners.akave.retry_data).to.deep.equal(retryData)
    })

    it('should update Vana sync status with error', async () => {
      const errorMessage = 'Test error message'
      const retryData = { vanaState: { status: 'failed' }, error: 'timeout' }
      
      await testDataUnion.updatePartnerSync('vana', false, errorMessage, retryData)
      
      expect(testDataUnion.partners.vana.is_synced).to.be.false
      expect(testDataUnion.partners.vana.error_message).to.equal(errorMessage)
      expect(testDataUnion.partners.vana.retry_data).to.deep.equal(retryData)
    })

    it('should update timestamps when syncing', async () => {
      const originalUpdatedAt = testDataUnion.updated_at
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await testDataUnion.updatePartnerSync('akave', true, null, { test: 'data' })
      
      expect(testDataUnion.updated_at.getTime()).to.be.greaterThan(originalUpdatedAt.getTime())
    })

    it('should throw error for non-existent partner', async () => {
      try {
        await testDataUnion.updatePartnerSync('nonexistent', true)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).to.include('Partner nonexistent not found')
      }
    })
  })

  describe('Query Methods', () => {
    it('should find by data reference', async () => {
      const foundRecord = await DataUnion.findByDataReference(
        'test_user_hash_123',
        'health',
        'test_health_data_id_456'
      )
      
      expect(foundRecord).to.exist
      expect(foundRecord._id.toString()).to.equal(testDataUnion._id.toString())
    })

    it('should find failed syncs for Akave', async () => {
      // Create a failed Akave sync
      await testDataUnion.updatePartnerSync('akave', false, 'Test error')
      
      const failedSyncs = await DataUnion.findFailedSyncs('akave')
      expect(failedSyncs).to.have.length(1)
      expect(failedSyncs[0]._id.toString()).to.equal(testDataUnion._id.toString())
    })

    it('should find failed syncs for Vana', async () => {
      // Create a failed Vana sync
      await testDataUnion.updatePartnerSync('vana', false, 'Test error')
      
      const failedSyncs = await DataUnion.findFailedSyncs('vana')
      expect(failedSyncs).to.have.length(1)
      expect(failedSyncs[0]._id.toString()).to.equal(testDataUnion._id.toString())
    })

    it('should filter failed syncs by data type', async () => {
      // Create a failed Vana sync
      await testDataUnion.updatePartnerSync('vana', false, 'Test error')
      
      const failedHealthSyncs = await DataUnion.findFailedSyncs('vana', 'health')
      expect(failedHealthSyncs).to.have.length(1)
      
      const failedCheckinSyncs = await DataUnion.findFailedSyncs('vana', 'checkin')
      expect(failedCheckinSyncs).to.have.length(0)
    })

    it('should return empty array for no failed syncs', async () => {
      // Clean up the test record first to ensure clean state
      if (testDataUnion && testDataUnion._id) {
        await DataUnion.deleteOne({ _id: testDataUnion._id })
        testDataUnion = null
      }
      
      // Also clean up any other test records that might exist
      await DataUnion.deleteMany({ user_hash: { $regex: /^test_/ } })
      
      const failedSyncs = await DataUnion.findFailedSyncs('akave')
      expect(failedSyncs).to.have.length(0)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency across updates', async () => {
      const testData = { signature: 'sig123', response: 'resp456' }
      
      await testDataUnion.updatePartnerSync('akave', true, null, testData)
      
      const updatedRecord = await DataUnion.findById(testDataUnion._id)
      expect(updatedRecord.partners.akave.retry_data).to.deep.equal(testData)
    })

    it('should handle multiple updates correctly', async () => {
      // First update
      await testDataUnion.updatePartnerSync('akave', true, null, { step: 1 })
      
      // Second update
      await testDataUnion.updatePartnerSync('akave', false, 'Error occurred', { step: 2, error: true })
      
      expect(testDataUnion.partners.akave.is_synced).to.be.false
      expect(testDataUnion.partners.akave.error_message).to.equal('Error occurred')
      expect(testDataUnion.partners.akave.retry_data.step).to.equal(2)
    })

    it('should allow different data types for same user', async () => {
      const checkinRecord = await DataUnion.createDataUnion({
        user_hash: 'test_user_hash_123',
        data_type: 'checkin',
        data_id: 'test_checkin_id_789'
      })
      
      expect(checkinRecord.data_type).to.equal('checkin')
      expect(checkinRecord.data_id).to.equal('test_checkin_id_789')
      
      // Clean up
      await DataUnion.deleteOne({ _id: checkinRecord._id })
    })
  })

  describe('Edge Cases', () => {
    it('should handle large retry data objects', async () => {
      const largeRetryData = {
        signature: 'very_long_signature_string_that_might_be_large',
        o3Response: {
          url: 'https://very.long.url.with.many.parameters.and.data',
          metadata: {
            size: 1024,
            timestamp: new Date().toISOString(),
            headers: {
              'content-type': 'application/json',
              'content-length': '1024',
              'cache-control': 'no-cache'
            }
          }
        }
      }
      
      await testDataUnion.updatePartnerSync('akave', true, null, largeRetryData)
      
      const updatedRecord = await DataUnion.findById(testDataUnion._id)
      expect(updatedRecord.partners.akave.retry_data).to.deep.equal(largeRetryData)
    })

    it('should handle special characters in error messages', async () => {
      const specialError = 'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      
      await testDataUnion.updatePartnerSync('vana', false, specialError)
      
      expect(testDataUnion.partners.vana.error_message).to.equal(specialError)
    })

    it('should handle null and undefined values gracefully', async () => {
      await testDataUnion.updatePartnerSync('akave', true, null, null)
      
      expect(testDataUnion.partners.akave.is_synced).to.be.true
      expect(testDataUnion.partners.akave.error_message).to.be.null
      expect(testDataUnion.partners.akave.retry_data).to.be.undefined
    })
  })

  describe('Database Indexing', () => {
    it('should have proper indexes for performance', async () => {
      // Get indexes asynchronously
      const indexes = await DataUnion.collection.indexes()
      expect(indexes).to.be.an('array')
      
      // Check for required indexes
      const indexNames = indexes.map(idx => Object.keys(idx.key).join('_'))
      expect(indexNames).to.include('user_hash_1_data_type_1_data_id_1')
      expect(indexNames).to.include('partners.vana.is_synced_1')
      expect(indexNames).to.include('partners.akave.is_synced_1')
    })
  })
}) 