const mongoose = require('mongoose')

const dataUnionSchema = new mongoose.Schema({
  user_hash: { 
    type: String, 
    required: [true, 'user_hash is required'],
    trim: true
  },
  data_type: { 
    type: String, 
    enum: {
      values: ['health', 'checkin'],
      message: 'data_type must be either "health" or "checkin"'
    }, 
    required: [true, 'data_type is required']
  },
  data_id: { 
    type: String, 
    required: [true, 'data_id is required'],
    trim: true
  }, // Reference to CheckIn or HealthData
  
  partners: {
    akave: {
      is_synced: { type: Boolean, default: false },
      error_message: { type: String, default: null },
      retry_data: { type: Object, default: null } // Store encryption keys, signatures, etc. for retries
    },
    vana: {
      is_synced: { type: Boolean, default: false },
      error_message: { type: String, default: null },
      retry_data: { type: Object, default: null }
    }
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

// Pre-save middleware to update timestamps
dataUnionSchema.pre('save', function(next) {
  this.updated_at = new Date()
  next()
})

// Index for faster lookups
dataUnionSchema.index({ user_hash: 1, data_type: 1, data_id: 1 }, { unique: true })
dataUnionSchema.index({ 'partners.vana.is_synced': 1 }) // For finding failed syncs
dataUnionSchema.index({ 'partners.akave.is_synced': 1 }) // For finding failed syncs
dataUnionSchema.index({ updated_at: -1 }) // For sorting by most recent

// Static method to create a new data union record
dataUnionSchema.statics.createDataUnion = async function(data) {
  try {
    // Check if record already exists
    const existingRecord = await this.findByDataReference(data.user_hash, data.data_type, data.data_id)
    if (existingRecord) {
      return existingRecord
    }
    
    const dataUnion = new this(data)
    return await dataUnion.save()
  } catch (error) {
    console.error('Failed to create DataUnion record:', error)
    throw new Error(`Failed to create DataUnion record: ${error.message}`)
  }
}

// Method to update sync status for a specific partner
dataUnionSchema.methods.updatePartnerSync = async function(partner, isSynced, errorMessage = null, retryData = null) {
  if (!this.partners[partner]) {
    throw new Error(`Partner ${partner} not found`)
  }
  
  try {
    this.partners[partner].is_synced = isSynced
    this.partners[partner].error_message = errorMessage
    if (retryData) {
      this.partners[partner].retry_data = retryData
    }
    this.updated_at = new Date()
    return await this.save()
  } catch (error) {
    console.error(`Failed to update partner sync for ${partner}:`, error)
    throw new Error(`Failed to update partner sync: ${error.message}`)
  }
}

// Static method to find failed syncs for retry
dataUnionSchema.statics.findFailedSyncs = async function(partner, dataType = null) {
  try {
    const query = { [`partners.${partner}.is_synced`]: false }
    if (dataType) {
      query.data_type = dataType
    }
    return await this.find(query).sort({ updated_at: -1 }) // Most recent first
  } catch (error) {
    console.error(`Failed to find failed syncs for ${partner}:`, error)
    throw new Error(`Failed to find failed syncs: ${error.message}`)
  }
}

// Static method to find by data reference
dataUnionSchema.statics.findByDataReference = async function(userHash, dataType, dataId) {
  try {
    if (!userHash || !dataType || !dataId) {
      throw new Error('Missing required parameters: userHash, dataType, or dataId')
    }
    
    return await this.findOne({
      user_hash: userHash,
      data_type: dataType,
      data_id: dataId
    })
  } catch (error) {
    console.error(`Failed to find data reference:`, error)
    throw new Error(`Failed to find data reference: ${error.message}`)
  }
}

const DataUnion = mongoose.model('DataUnion', dataUnionSchema)

module.exports = DataUnion 