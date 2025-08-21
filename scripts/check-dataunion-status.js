const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/database');
const logger = require('../utils/logger');
const DataUnion = require('../models/dataUnion');

// Load environment variables
dotenv.config();

async function checkDataUnionStatus() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Get a sample of DataUnion records to see what we have
    const sampleRecords = await DataUnion.find().limit(5).lean();
    
    logger.info(`Found ${sampleRecords.length} sample DataUnion records:`);
    
    sampleRecords.forEach((record, index) => {
      logger.info(`\n--- Record ${index + 1} ---`);
      logger.info(`User Hash: ${record.user_hash}`);
      logger.info(`Data Type: ${record.data_type}`);
      logger.info(`Data ID: ${record.data_id}`);
      logger.info(`Akave synced: ${record.partners?.akave?.is_synced}`);
      logger.info(`Vana synced: ${record.partners?.vana?.is_synced}`);
      logger.info(`Akave retry_data:`, JSON.stringify(record.partners?.akave?.retry_data, null, 2));
      logger.info(`Vana retry_data:`, JSON.stringify(record.partners?.vana?.retry_data, null, 2));
    });
    
    // Check overall counts
    const totalRecords = await DataUnion.countDocuments();
    const akaveSynced = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSynced = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    
    logger.info(`\n--- Overall Status ---`);
    logger.info(`Total DataUnion records: ${totalRecords}`);
    logger.info(`Akave synced: ${akaveSynced}`);
    logger.info(`Vana synced: ${vanaSynced}`);
    logger.info(`Vana not synced: ${totalRecords - vanaSynced}`);
    
    // Check if any records have meaningful retry data
    const recordsWithAkaveData = await DataUnion.countDocuments({
      'partners.akave.retry_data': { $exists: true, $ne: null },
      $or: [
        { 'partners.akave.retry_data.fileId': { $exists: true } },
        { 'partners.akave.retry_data.o3Response': { $exists: true } },
        { 'partners.akave.retry_data.url': { $exists: true } }
      ]
    });
    
    logger.info(`Records with meaningful Akave retry data: ${recordsWithAkaveData}`);
    
  } catch (error) {
    logger.error('Check failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkDataUnionStatus()
    .then(() => {
      logger.info('Status check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Status check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDataUnionStatus };
