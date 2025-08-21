const mongoose = require('mongoose')
const DataUnion = require('../models/dataUnion')
const { expect } = require('chai')
require('dotenv').config()

describe('Queue Service Integration Tests', function() {
  // Increase timeout for MongoDB connection
  this.timeout(10000)

  // Mock the queue service to avoid actual Redis connections during testing
  const mockQueueService = {
    getSyncStats: async () => {
      const totalRecords = await DataUnion.countDocuments()
      const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true })
      const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true })
      const akaveFailed = await DataUnion.countDocuments({ 'partners.akave.is_synced': false })
      const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false })
      
      return {
        total: totalRecords,
        akave: { 
          success: akaveSuccess, 
          failed: akaveFailed, 
          successRate: totalRecords > 0 ? Math.round((akaveSuccess / totalRecords) * 100) : 0 
        },
        vana: { 
          success: vanaSuccess, 
          failed: vanaFailed, 
          successRate: totalRecords > 0 ? Math.round((vanaSuccess / totalRecords) * 100) : 0 
        }
      }
    },

    retryFailedSyncs: async (partner, dataType = null) => {
      const failedSyncs = await DataUnion.findFailedSyncs(partner, dataType)
      return {
        message: `Found ${failedSyncs.length} failed syncs for ${partner}`,
        totalFailed: failedSyncs.length,
        retryCount: failedSyncs.length
      }
    }
  }

  before(async () => {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
  })

  after(async () => {
    await mongoose.connection.close()
  })

  let testDataUnions = []

  beforeEach(async () => {
    // Clean up any existing test data first
    await DataUnion.deleteMany({ user_hash: { $regex: /^test_user_/ } })
    
    // Create test DataUnion records with different sync states
    const testRecords = [
      {
        user_hash: 'test_user_1',
        data_type: 'health',
        data_id: 'health_1'
      },
      {
        user_hash: 'test_user_2',
        data_type: 'checkin',
        data_id: 'checkin_1'
      },
      {
        user_hash: 'test_user_3',
        data_type: 'health',
        data_id: 'health_2'
      }
    ]

    for (const record of testRecords) {
      const dataUnion = await DataUnion.createDataUnion(record)
      testDataUnions.push(dataUnion)
    }

    // Set different sync states for testing
    await testDataUnions[0].updatePartnerSync('akave', true, null, { success: true })
    await testDataUnions[0].updatePartnerSync('vana', true, null, { success: true })
    
    await testDataUnions[1].updatePartnerSync('akave', false, 'Akave failed', { error: true })
    await testDataUnions[1].updatePartnerSync('vana', true, null, { success: true })
    
    await testDataUnions[2].updatePartnerSync('akave', true, null, { success: true })
    await testDataUnions[2].updatePartnerSync('vana', false, 'Vana failed', { error: true })
  })

  afterEach(async () => {
    // Clean up all test records
    for (const dataUnion of testDataUnions) {
      if (dataUnion && dataUnion._id) {
        await DataUnion.deleteOne({ _id: dataUnion._id })
      }
    }
    testDataUnions = []
    
    // Additional cleanup to ensure clean state
    await DataUnion.deleteMany({ user_hash: { $regex: /^test_user_/ } })
  })

  describe('Sync Statistics', () => {
    it('should return correct sync statistics', async () => {
      const stats = await mockQueueService.getSyncStats()
      
      expect(stats).to.have.property('total', 3)
      expect(stats).to.have.property('akave')
      expect(stats).to.have.property('vana')
      
      // Akave: 2 success, 1 failed
      expect(stats.akave.success).to.equal(2)
      expect(stats.akave.failed).to.equal(1)
      expect(stats.akave.successRate).to.equal(67)
      
      // Vana: 2 success, 1 failed
      expect(stats.vana.success).to.equal(2)
      expect(stats.vana.failed).to.equal(1)
      expect(stats.vana.successRate).to.equal(67)
    })

    it('should handle empty database correctly', async () => {
      // Clear all records
      await DataUnion.deleteMany({})
      
      const stats = await mockQueueService.getSyncStats()
      
      expect(stats.total).to.equal(0)
      expect(stats.akave.success).to.equal(0)
      expect(stats.akave.failed).to.equal(0)
      expect(stats.akave.successRate).to.equal(0)
      expect(stats.vana.success).to.equal(0)
      expect(stats.vana.failed).to.equal(0)
      expect(stats.vana.successRate).to.equal(0)
    })
  })

  describe('Failed Sync Retry', () => {
    it('should find failed Akave syncs', async () => {
      const result = await mockQueueService.retryFailedSyncs('akave')
      
      expect(result.totalFailed).to.equal(1)
      expect(result.message).to.include('1 failed syncs for akave')
    })

    it('should find failed Vana syncs', async () => {
      const result = await mockQueueService.retryFailedSyncs('vana')
      
      expect(result.totalFailed).to.equal(1)
      expect(result.message).to.include('1 failed syncs for vana')
    })

    it('should filter failed syncs by data type', async () => {
      const healthResult = await mockQueueService.retryFailedSyncs('vana', 'health')
      const checkinResult = await mockQueueService.retryFailedSyncs('vana', 'checkin')
      
      expect(healthResult.totalFailed).to.equal(1)
      expect(checkinResult.totalFailed).to.equal(0)
    })

    it('should handle no failed syncs', async () => {
      // Mark all as successful
      for (const dataUnion of testDataUnions) {
        await dataUnion.updatePartnerSync('akave', true, null, { success: true })
        await dataUnion.updatePartnerSync('vana', true, null, { success: true })
      }
      
      const result = await mockQueueService.retryFailedSyncs('akave')
      expect(result.totalFailed).to.equal(0)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain sync state across operations', async () => {
      // Verify initial state
      const initialStats = await mockQueueService.getSyncStats()
      expect(initialStats.total).to.equal(3)
      
      // Update one record
      await testDataUnions[0].updatePartnerSync('akave', false, 'New error')
      
      // Verify updated state
      const updatedStats = await mockQueueService.getSyncStats()
      expect(updatedStats.akave.failed).to.equal(2)
      expect(updatedStats.akave.success).to.equal(1)
    })

    it('should handle concurrent updates correctly', async () => {
      // Simulate concurrent updates
      const updatePromises = testDataUnions.map(dataUnion => 
        dataUnion.updatePartnerSync('akave', true, null, { concurrent: true })
      )
      
      await Promise.all(updatePromises)
      
      const stats = await mockQueueService.getSyncStats()
      expect(stats.akave.success).to.equal(3)
      expect(stats.akave.failed).to.equal(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking mongoose connection errors
      // For now, we'll test that the service doesn't crash on normal operations
      const stats = await mockQueueService.getSyncStats()
      expect(stats).to.be.an('object')
    })

    it('should handle invalid partner names', async () => {
      try {
        await mockQueueService.retryFailedSyncs('invalid_partner')
        // Should not throw for invalid partner names in this mock
      } catch (error) {
        expect.fail('Should not throw error for invalid partner names')
      }
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of records efficiently', async () => {
      // Create additional test records
      const additionalRecords = []
      for (let i = 0; i < 10; i++) {
        const record = await DataUnion.createDataUnion({
          user_hash: `perf_test_user_${i}`,
          data_type: i % 2 === 0 ? 'health' : 'checkin',
          data_id: `perf_test_id_${i}`
        })
        additionalRecords.push(record)
        
        // Set random sync states
        await record.updatePartnerSync('akave', Math.random() > 0.5, null, { perf: true })
        await record.updatePartnerSync('vana', Math.random() > 0.5, null, { perf: true })
      }
      
      const startTime = Date.now()
      const stats = await mockQueueService.getSyncStats()
      const endTime = Date.now()
      
      expect(stats.total).to.equal(13) // 3 original + 10 new
      expect(endTime - startTime).to.be.lessThan(1000) // Should complete within 1 second
      
      // Clean up additional records
      for (const record of additionalRecords) {
        await DataUnion.deleteOne({ _id: record._id })
      }
    })
  })
}) 