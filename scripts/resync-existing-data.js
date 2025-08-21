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

async function resyncExistingData() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Find all DataUnion records that haven't been synced to Vana
    const unsyncedRecords = await DataUnion.find({ 'partners.vana.is_synced': false });
    
    logger.info(`Found ${unsyncedRecords.length} records not synced to Vana`);
    
    if (unsyncedRecords.length === 0) {
      logger.info('All records are already synced to Vana');
      return;
    }
    
    let checkinCount = 0;
    let healthDataCount = 0;
    let errorCount = 0;
    
    for (const dataUnion of unsyncedRecords) {
      try {
        let originalData;
        
        // Find the original data based on type
        if (dataUnion.data_type === 'checkin') {
          originalData = await CheckIn.findOne({ checkinId: dataUnion.data_id });
          if (!originalData) {
            logger.warn(`Check-in ${dataUnion.data_id} not found, skipping`);
            continue;
          }
        } else if (dataUnion.data_type === 'health') {
          originalData = await HealthData.findOne({ healthDataId: dataUnion.data_id });
          if (!originalData) {
            logger.warn(`Health data ${dataUnion.data_id} not found, skipping`);
            continue;
          }
        } else {
          logger.warn(`Unknown data type ${dataUnion.data_type}, skipping`);
          continue;
        }
        
        // Add to queue for full reprocessing (Akave + Vana)
        await addToQueue(
          dataUnion.data_type === 'checkin' ? QUEUE_TYPES.CHECKIN : QUEUE_TYPES.HEALTH,
          originalData.toObject(),
          null, // No telegramId for existing data
          dataUnion.user_hash
        );
        
        if (dataUnion.data_type === 'checkin') {
          checkinCount++;
          logger.info(`Queued check-in ${dataUnion.data_id} for resync`);
        } else {
          healthDataCount++;
          logger.info(`Queued health data ${dataUnion.data_id} for resync`);
        }
        
      } catch (error) {
        logger.error(`Error queuing ${dataUnion.data_type} ${dataUnion.data_id}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`Resync queuing completed!`);
    logger.info(`Check-ins queued: ${checkinCount}`);
    logger.info(`Health data queued: ${healthDataCount}`);
    logger.info(`Errors: ${errorCount}`);
    
    // Show current sync status
    logger.info('Current sync status:');
    const totalRecords = await DataUnion.countDocuments();
    const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false });
    
    logger.info(`Total DataUnion records: ${totalRecords}`);
    logger.info(`Akave synced: ${akaveSuccess}`);
    logger.info(`Vana synced: ${vanaSuccess}`);
    logger.info(`Vana not synced: ${vanaFailed}`);
    
  } catch (error) {
    logger.error('Resync failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the resync if this script is executed directly
if (require.main === module) {
  resyncExistingData()
    .then(() => {
      logger.info('Resync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Resync failed:', error);
      process.exit(1);
    });
}

module.exports = { resyncExistingData };
