const mongoose = require('mongoose')
require('dotenv').config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthbuddy')

async function addSchemaVersioning() {
  try {
    console.log('🔄 Starting schema versioning migration...')
    
    // Wait for connection to be ready
    await mongoose.connection.asPromise()
    console.log('✅ Connected to MongoDB')
    
    const db = mongoose.connection.db
    
    // Update DataUnion collection
    console.log('📝 Updating DataUnion collection...')
    const dataUnionResult = await db.collection('dataunions').updateMany(
      { schema_version: { $exists: false } },
      { $set: { schema_version: 'v1' } }
    )
    console.log(`✅ Updated ${dataUnionResult.modifiedCount} DataUnion records`)
    
    // Update CheckIn collection
    console.log('📝 Updating CheckIn collection...')
    const checkInResult = await db.collection('checkins').updateMany(
      { schema_version: { $exists: false } },
      { $set: { schema_version: 'v1' } }
    )
    console.log(`✅ Updated ${checkInResult.modifiedCount} CheckIn records`)
    
    // Update HealthData collection
    console.log('📝 Updating HealthData collection...')
    const healthDataResult = await db.collection('healthdatas').updateMany(
      { schema_version: { $exists: false } },
      { $set: { schema_version: 'v1' } }
    )
    console.log(`✅ Updated ${healthDataResult.modifiedCount} HealthData records`)
    
    console.log('🎉 Schema versioning migration completed successfully!')
    
    // Show summary
    const dataUnionCount = await db.collection('dataunions').countDocuments()
    const checkInCount = await db.collection('checkins').countDocuments()
    const healthDataCount = await db.collection('healthdatas').countDocuments()
    
    console.log('\n📊 Collection Summary:')
    console.log(`DataUnion: ${dataUnionCount} records`)
    console.log(`CheckIn: ${checkInCount} records`)
    console.log(`HealthData: ${healthDataCount} records`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run migration
addSchemaVersioning()
