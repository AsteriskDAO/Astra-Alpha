const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/database');
const logger = require('../utils/logger');
const DataUnion = require('../models/dataUnion');
const CheckIn = require('../models/checkIn');
const HealthData = require('../models/healthData');
const { addToQueue, QUEUE_TYPES } = require('../services/queue');

// Load environment variables
dotenv.config();

async function cleanAndResyncAll() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Step 1: Clean existing DataUnion records
    logger.info('Step 1: Cleaning existing DataUnion records...');
    
    const existingDataUnions = await DataUnion.find({});
    logger.info(`Found ${existingDataUnions.length} existing DataUnion records`);
    
    // Reset all records to clean state
    for (const dataUnion of existingDataUnions) {
      await dataUnion.updatePartnerSync('akave', false, null, null);
      await dataUnion.updatePartnerSync('vana', false, null, null);
      logger.info(`Reset DataUnion record for ${dataUnion.data_type} ${dataUnion.data_id}`);
    }
    
    logger.info('✅ All DataUnion records cleaned');
    
    // Step 2: Get all existing data
    logger.info('\nStep 2: Gathering all existing data...');
    
    const existingCheckins = await CheckIn.find({}).lean();
    const existingHealthData = await HealthData.find({}).lean();
    
    logger.info(`Found ${existingCheckins.length} check-ins`);
    logger.info(`Found ${existingHealthData.length} health data records`);
    
    // Step 3: Re-queue everything for fresh processing
    logger.info('\nStep 3: Re-queuing all data for fresh processing...');
    
    let checkinCount = 0;
    let healthDataCount = 0;
    let errorCount = 0;
    
    // Queue all check-ins
    for (const checkin of existingCheckins) {
      try {
        await addToQueue(
          QUEUE_TYPES.CHECKIN,
          checkin,
          null, // No telegramId for existing data
          checkin.user_hash
        );
        checkinCount++;
        logger.info(`✅ Queued check-in ${checkin.checkinId}`);
      } catch (error) {
        logger.error(`❌ Failed to queue check-in ${checkin.checkinId}:`, error);
        errorCount++;
      }
    }
    
    // Queue all health data
    for (const healthData of existingHealthData) {
      try {
        await addToQueue(
          QUEUE_TYPES.HEALTH,
          healthData,
          null, // No telegramId for existing data
          healthData.user_hash
        );
        healthDataCount++;
        logger.info(`✅ Queued health data ${healthData.healthDataId}`);
      } catch (error) {
        logger.error(`❌ Failed to queue health data ${healthData.healthDataId}:`, error);
        errorCount++;
      }
    }
    
    logger.info('\n=== RESYNC COMPLETED ===');
    logger.info(`Check-ins queued: ${checkinCount}`);
    logger.info(`Health data queued: ${healthDataCount}`);
    logger.info(`Errors: ${errorCount}`);
    logger.info(`Total queued: ${checkinCount + healthDataCount}`);
    
    // Show final status
    logger.info('\nFinal sync status:');
    const totalRecords = await DataUnion.countDocuments();
    const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    
    logger.info(`Total DataUnion records: ${totalRecords}`);
    logger.info(`Akave synced: ${akaveSuccess}`);
    logger.info(`Vana synced: ${vanaSuccess}`);
    
    logger.info('\n🎯 NEXT STEPS:');
    logger.info('1. Wait for the queue to process all records through Akave');
    logger.info('2. Monitor progress with: npm run check:status');
    logger.info('3. Once Akave is complete, run: npm run vana:refiner');
    logger.info('4. Or let the queue continue through Vana automatically');
    
  } catch (error) {
    logger.error('Clean and resync failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the clean and resync if this script is executed directly
if (require.main === module) {
  cleanAndResyncAll()
    .then(() => {
      logger.info('Clean and resync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Clean and resync failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanAndResyncAll };
