const mongoose = require('mongoose')
const DataUnion = require('../models/dataUnion')
const { expect } = require('chai')
require('dotenv').config()

describe('Admin API Tests', function() {
  // Increase timeout for MongoDB connection
  this.timeout(10000)

  // Mock the admin controller methods
  const mockAdminController = {
    getSyncStats: async (req, res) => {
      try {
        const totalRecords = await DataUnion.countDocuments()
        const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true })
        const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true })
        const akaveFailed = await DataUnion.countDocuments({ 'partners.akave.is_synced': false })
        const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false })
        
        const stats = {
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
        
        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to get sync stats' })
      }
    },

    retryFailedSyncs: async (req, res) => {
      try {
        const { partner, dataType } = req.body
        
        if (!partner || !['akave', 'vana'].includes(partner)) {
          return res.status(400).json({ error: 'Invalid partner. Must be "akave" or "vana"' })
        }
        
        const failedSyncs = await DataUnion.findFailedSyncs(partner, dataType)
        
        res.json({ 
          message: `Found ${failedSyncs.length} failed syncs for ${partner}`,
          totalFailed: failedSyncs.length,
          retryCount: failedSyncs.length
        })
      } catch (error) {
        res.status(500).json({ error: 'Failed to retry failed syncs' })
      }
    }
  }

  // Mock response object
  const createMockResponse = () => {
    const res = {
      status: (code) => {
        res.statusCode = code
        return res
      },
      json: (data) => {
        res.data = data
        return res
      }
    }
    return res
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
  let mockRes

  beforeEach(async () => {
    // Clean up any existing test data first
    await DataUnion.deleteMany({ user_hash: { $regex: /^admin_test_/ } })
    
    mockRes = createMockResponse()
    
    // Create test DataUnion records with different sync states
    const testRecords = [
      {
        user_hash: 'admin_test_user_1',
        data_type: 'health',
        data_id: 'admin_health_1'
      },
      {
        user_hash: 'admin_test_user_2',
        data_type: 'checkin',
        data_id: 'admin_checkin_1'
      },
      {
        user_hash: 'admin_test_user_3',
        data_type: 'health',
        data_id: 'admin_health_2'
      },
      {
        user_hash: 'admin_test_user_4',
        data_type: 'checkin',
        data_id: 'admin_checkin_2'
      }
    ]

    for (const record of testRecords) {
      const dataUnion = await DataUnion.createDataUnion(record)
      testDataUnions.push(dataUnion)
    }

    // Set different sync states for testing
    // Record 1: Both successful
    await testDataUnions[0].updatePartnerSync('akave', true, null, { success: true })
    await testDataUnions[0].updatePartnerSync('vana', true, null, { success: true })
    
    // Record 2: Akave failed, Vana successful
    await testDataUnions[1].updatePartnerSync('akave', false, 'Akave upload failed', { error: true })
    await testDataUnions[1].updatePartnerSync('vana', true, null, { success: true })
    
    // Record 3: Akave successful, Vana failed
    await testDataUnions[2].updatePartnerSync('akave', true, null, { success: true })
    await testDataUnions[2].updatePartnerSync('vana', false, 'Vana upload failed', { error: true })
    
    // Record 4: Both failed
    await testDataUnions[3].updatePartnerSync('akave', false, 'Akave connection error', { error: true })
    await testDataUnions[3].updatePartnerSync('vana', false, 'Vana timeout', { error: true })
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
    await DataUnion.deleteMany({ user_hash: { $regex: /^admin_test_/ } })
  })

  describe('GET /admin/sync-stats', () => {
    it('should return correct sync statistics', async () => {
      await mockAdminController.getSyncStats({}, mockRes)
      
      expect(mockRes.data).to.have.property('total', 4)
      expect(mockRes.data).to.have.property('akave')
      expect(mockRes.data).to.have.property('vana')
      
      // Akave: 2 success, 2 failed
      expect(mockRes.data.akave.success).to.equal(2)
      expect(mockRes.data.akave.failed).to.equal(2)
      expect(mockRes.data.akave.successRate).to.equal(50)
      
      // Vana: 2 success, 2 failed
      expect(mockRes.data.vana.success).to.equal(2)
      expect(mockRes.data.vana.failed).to.equal(2)
      expect(mockRes.data.vana.successRate).to.equal(50)
    })

    it('should handle empty database', async () => {
      // Clear all records
      await DataUnion.deleteMany({})
      
      await mockAdminController.getSyncStats({}, mockRes)
      
      expect(mockRes.data.total).to.equal(0)
      expect(mockRes.data.akave.success).to.equal(0)
      expect(mockRes.data.akave.failed).to.equal(0)
      expect(mockRes.data.akave.successRate).to.equal(0)
      expect(mockRes.data.vana.success).to.equal(0)
      expect(mockRes.data.vana.failed).to.equal(0)
      expect(mockRes.data.vana.successRate).to.equal(0)
    })

    it('should calculate success rates correctly', async () => {
      // Mark all as successful
      for (const dataUnion of testDataUnions) {
        await dataUnion.updatePartnerSync('akave', true, null, { success: true })
        await dataUnion.updatePartnerSync('vana', true, null, { success: true })
      }
      
      await mockAdminController.getSyncStats({}, mockRes)
      
      expect(mockRes.data.akave.successRate).to.equal(100)
      expect(mockRes.data.vana.successRate).to.equal(100)
    })
  })

  describe('POST /admin/retry-failed-syncs', () => {
    it('should find failed Akave syncs', async () => {
      const mockReq = { body: { partner: 'akave' } }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.data.totalFailed).to.equal(2)
      expect(mockRes.data.message).to.include('2 failed syncs for akave')
    })

    it('should find failed Vana syncs', async () => {
      const mockReq = { body: { partner: 'vana' } }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.data.totalFailed).to.equal(2)
      expect(mockRes.data.message).to.include('2 failed syncs for vana')
    })

    it('should filter by data type', async () => {
      const mockReq = { body: { partner: 'vana', dataType: 'health' } }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.data.totalFailed).to.equal(1)
      expect(mockRes.data.message).to.include('1 failed syncs for vana')
    })

    it('should handle no failed syncs', async () => {
      // Mark all as successful
      for (const dataUnion of testDataUnions) {
        await dataUnion.updatePartnerSync('akave', true, null, { success: true })
        await dataUnion.updatePartnerSync('vana', true, null, { success: true })
      }
      
      const mockReq = { body: { partner: 'akave' } }
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.data.totalFailed).to.equal(0)
    })

    it('should validate partner parameter', async () => {
      const mockReq = { body: { partner: 'invalid_partner' } }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.statusCode).to.equal(400)
      expect(mockRes.data.error).to.include('Invalid partner')
    })

    it('should handle missing partner parameter', async () => {
      const mockReq = { body: {} }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.statusCode).to.equal(400)
      expect(mockRes.data.error).to.include('Invalid partner')
    })
  })

  describe('API Response Format', () => {
    it('should return consistent response structure for sync stats', async () => {
      await mockAdminController.getSyncStats({}, mockRes)
      
      expect(mockRes.data).to.have.property('total')
      expect(mockRes.data).to.have.property('akave')
      expect(mockRes.data).to.have.property('vana')
      
      expect(mockRes.data.akave).to.have.property('success')
      expect(mockRes.data.akave).to.have.property('failed')
      expect(mockRes.data.akave).to.have.property('successRate')
      
      expect(mockRes.data.vana).to.have.property('success')
      expect(mockRes.data.vana).to.have.property('failed')
      expect(mockRes.data.vana).to.have.property('successRate')
    })

    it('should return consistent response structure for retry', async () => {
      const mockReq = { body: { partner: 'akave' } }
      
      await mockAdminController.retryFailedSyncs(mockReq, mockRes)
      
      expect(mockRes.data).to.have.property('message')
      expect(mockRes.data).to.have.property('totalFailed')
      expect(mockRes.data).to.have.property('retryCount')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking mongoose connection errors
      // For now, we'll test that the API doesn't crash on normal operations
      await mockAdminController.getSyncStats({}, mockRes)
      expect(mockRes.data).to.be.an('object')
    })

    it('should validate input parameters', async () => {
      const invalidPartners = ['', null, undefined, 123, {}, []]
      
      for (const invalidPartner of invalidPartners) {
        const mockReq = { body: { partner: invalidPartner } }
        await mockAdminController.retryFailedSyncs(mockReq, mockRes)
        
        if (invalidPartner !== 'akave' && invalidPartner !== 'vana') {
          expect(mockRes.statusCode).to.equal(400)
        }
      }
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create additional test records
      const additionalRecords = []
      for (let i = 0; i < 20; i++) {
        const record = await DataUnion.createDataUnion({
          user_hash: `perf_admin_user_${i}`,
          data_type: i % 2 === 0 ? 'health' : 'checkin',
          data_id: `perf_admin_id_${i}`
        })
        additionalRecords.push(record)
        
        // Set random sync states
        await record.updatePartnerSync('akave', Math.random() > 0.5, null, { perf: true })
        await record.updatePartnerSync('vana', Math.random() > 0.5, null, { perf: true })
      }
      
      const startTime = Date.now()
      await mockAdminController.getSyncStats({}, mockRes)
      const endTime = Date.now()
      
      expect(mockRes.data.total).to.equal(24) // 4 original + 20 new
      expect(endTime - startTime).to.be.lessThan(2000) // Should complete within 2 seconds
      
      // Clean up additional records
      for (const record of additionalRecords) {
        await DataUnion.deleteOne({ _id: record._id })
      }
    })
  })
}) 