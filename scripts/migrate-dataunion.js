const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/database');
const logger = require('../utils/logger');
const DataUnion = require('../models/dataUnion');
const CheckIn = require('../models/checkIn');
const HealthData = require('../models/healthData');

// Load environment variables
dotenv.config();

async function migrateDataUnion() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Get the database connection
    const db = mongoose.connection.db;
    
    // Get collections
    const checkinCollection = db.collection('checkins');
    const healthDataCollection = db.collection('healthdatas');
    
    // Find all existing check-ins and health data
    const existingCheckins = await checkinCollection.find({}).toArray();
    const existingHealthData = await healthDataCollection.find({}).toArray();
    
    logger.info(`Found ${existingCheckins.length} existing check-ins`);
    logger.info(`Found ${existingHealthData.length} existing health data records`);
    
    let checkinDataUnionCount = 0;
    let healthDataUnionCount = 0;
    let errorCount = 0;
    
    // Create DataUnion records for check-ins
    for (const checkin of existingCheckins) {
    try {
        // Check if DataUnion record already exists
        const existingDataUnion = await DataUnion.findByDataReference(
        checkin.user_hash,
        'checkin',
        checkin.checkinId
        );
        
        if (!existingDataUnion) {
        // Create new DataUnion record
        const dataUnionData = {
            user_hash: checkin.user_hash,
            data_type: 'checkin',
            data_id: checkin.checkinId,
            partners: {
            akave: {
                is_synced: true,
                error_message: null,
                retry_data: {
                // Mark as synced to Akave (assuming existing data was uploaded)
                synced: true,
                timestamp: new Date()
                }
            },
            vana: {
                is_synced: false,
                error_message: 'Not yet synced to Vana',
                retry_data: null
            }
            }
        };
        
        await DataUnion.createDataUnion(dataUnionData);
        checkinDataUnionCount++;
        logger.info(`Created DataUnion for check-in ${checkin.checkinId}`);
        } else {
        logger.info(`DataUnion already exists for check-in ${checkin.checkinId}`);
        }
        
    } catch (error) {
        logger.error(`Error creating DataUnion for check-in ${checkin.checkinId}:`, error);
        errorCount++;
    }
    }
    
    // Create DataUnion records for health data
    for (const healthData of existingHealthData) {
      try {
        // Check if DataUnion record already exists
        const existingDataUnion = await DataUnion.findByDataReference(
          healthData.user_hash,
          'health',
          healthData.healthDataId
        );
        
        if (!existingDataUnion) {
          // Create new DataUnion record
          const dataUnionData = {
            user_hash: healthData.user_hash,
            data_type: 'health',
            data_id: healthData.healthDataId,
            partners: {
              akave: {
                is_synced: true,
                error_message: null,
                retry_data: {
                  // Mark as synced to Akave (assuming existing data was uploaded)
                  synced: true,
                  timestamp: new Date()
                }
              },
              vana: {
                is_synced: false,
                error_message: 'Not yet synced to Vana',
                retry_data: null
              }
            }
          };
          
          await DataUnion.createDataUnion(dataUnionData);
          healthDataUnionCount++;
          logger.info(`Created DataUnion for health data ${healthData.healthDataId}`);
        } else {
          logger.info(`DataUnion already exists for health data ${healthData.healthDataId}`);
        }
        
      } catch (error) {
        logger.error(`Error creating DataUnion for health data ${healthData.healthDataId}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`DataUnion migration completed successfully!`);
    logger.info(`Check-in DataUnion records created: ${checkinDataUnionCount}`);
    logger.info(`Health data DataUnion records created: ${healthDataUnionCount}`);
    logger.info(`Errors: ${errorCount}`);
    
    // Verify the migration by checking DataUnion statistics
    logger.info('Verifying migration...');
    const totalDataUnions = await DataUnion.countDocuments();
    const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false });
    
    logger.info(`Total DataUnion records: ${totalDataUnions}`);
    logger.info(`Akave synced: ${akaveSuccess}`);
    logger.info(`Vana synced: ${vanaSuccess}`);
    logger.info(`Vana not synced: ${vanaFailed}`);
    
    // Show sample DataUnion records
    const sampleDataUnions = await DataUnion.find().limit(3).lean();
    logger.info('Sample DataUnion records:');
    
    for (const dataUnion of sampleDataUnions) {
      logger.info(`DataUnion ${dataUnion._id}:`);
      logger.info(`  - user_hash: ${dataUnion.user_hash}`);
      logger.info(`  - data_type: ${dataUnion.data_type}`);
      logger.info(`  - data_id: ${dataUnion.data_id}`);
      logger.info(`  - Akave synced: ${dataUnion.partners.akave.is_synced}`);
      logger.info(`  - Vana synced: ${dataUnion.partners.vana.is_synced}`);
    }
    
  } catch (error) {
    logger.error('DataUnion migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateDataUnion()
    .then(() => {
      logger.info('DataUnion migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('DataUnion migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDataUnion };
