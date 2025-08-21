const mongoose = require('mongoose');
const logger = require('../utils/logger');
const DataUnion = require('../models/dataUnion');
const CheckIn = require('../models/checkIn');
const HealthData = require('../models/healthData');
const { addToQueue, QUEUE_TYPES } = require('../services/queue');

async function testSingleUpload() {
  try {
    logger.info('=== TESTING SINGLE FILE UPLOAD ===');
    
    // Get one sample record of each type
    const sampleCheckin = await CheckIn.findOne({}).lean();
    const sampleHealthData = await HealthData.findOne({}).lean();
    
    if (!sampleCheckin && !sampleHealthData) {
      logger.error('No data found to test with');
      return { success: false, error: 'No data found to test with' };
    }
    
    let results = {
      checkin: null,
      healthData: null,
      success: true
    };
    
    // Test with check-in if available
    if (sampleCheckin) {
      logger.info(`\n🧪 Testing with check-in: ${sampleCheckin.checkinId}`);
      
      // Check if DataUnion record exists
      let dataUnion = await DataUnion.findByDataReference(
        sampleCheckin.user_hash, 
        'checkin', 
        sampleCheckin.checkinId
      );
      
      if (!dataUnion) {
        logger.info('Creating new DataUnion record for test');
        const dataUnionData = {
          user_hash: sampleCheckin.user_hash,
          data_type: 'checkin',
          data_id: sampleCheckin.checkinId,
          partners: {
            akave: { is_synced: false, error_message: null, retry_data: null },
            vana: { is_synced: false, error_message: null, retry_data: null }
          }
        };
        dataUnion = await DataUnion.createDataUnion(dataUnionData);
        logger.info('✅ DataUnion record created');
      } else {
        logger.info('Found existing DataUnion record, resetting for test');
        await dataUnion.updatePartnerSync('akave', false, null, null);
        await dataUnion.updatePartnerSync('vana', false, null, null);
        logger.info('✅ DataUnion record reset');
      }
      
      // Add to queue
      logger.info('Adding to queue for test...');
      await addToQueue(
        QUEUE_TYPES.CHECKIN,
        sampleCheckin,
        null,
        sampleCheckin.user_hash
      );
      logger.info('✅ Check-in added to queue');
      
      results.checkin = {
        checkinId: sampleCheckin.checkinId,
        user_hash: sampleCheckin.user_hash,
        queued: true
      };
    }
    
    // Test with health data if available
    if (sampleHealthData) {
      logger.info(`\n🧪 Testing with health data: ${sampleHealthData.healthDataId}`);
      
      // Check if DataUnion record exists
      let dataUnion = await DataUnion.findByDataReference(
        sampleHealthData.user_hash, 
        'health', 
        sampleHealthData.healthDataId
      );
      
      if (!dataUnion) {
        logger.info('Creating new DataUnion record for test');
        const dataUnionData = {
          user_hash: sampleHealthData.user_hash,
          data_type: 'health',
          data_id: sampleHealthData.healthDataId,
          partners: {
            akave: { is_synced: false, error_message: null, retry_data: null },
            vana: { is_synced: false, error_message: null, retry_data: null }
          }
        };
        dataUnion = await DataUnion.createDataUnion(dataUnionData);
        logger.info('✅ DataUnion record created');
      } else {
        logger.info('Found existing DataUnion record, resetting for test');
        await dataUnion.updatePartnerSync('akave', false, null, null);
        await dataUnion.updatePartnerSync('vana', false, null, null);
        logger.info('✅ DataUnion record reset');
      }
      
      // Add to queue
      logger.info('Adding to queue for test...');
      await addToQueue(
        QUEUE_TYPES.HEALTH,
        sampleHealthData,
        null,
        sampleHealthData.user_hash
      );
      logger.info('✅ Health data added to queue');
      
      results.healthData = {
        healthDataId: sampleHealthData.healthDataId,
        user_hash: sampleHealthData.user_hash,
        queued: true
      };
    }
    
    logger.info('\n🎯 TEST SETUP COMPLETE!');
    logger.info('\nThe queue is now processing these test records...');
    logger.info('Monitor progress with: npm run check:status');
    
    // Show current test status
    logger.info('\nCurrent test status:');
    const totalRecords = await DataUnion.countDocuments();
    const akaveSuccess = await DataUnion.countDocuments({ 'partners.akave.is_synced': true });
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    
    logger.info(`Total DataUnion records: ${totalRecords}`);
    logger.info(`Akave synced: ${akaveSuccess}`);
    logger.info(`Vana synced: ${vanaSuccess}`);
    
    return results;
    
  } catch (error) {
    logger.error('Test failed:', error);
    return { success: false, error: error.message };
  }
}

// For standalone execution (if needed)
if (require.main === module) {
  testSingleUpload()
    .then((results) => {
      if (results.success) {
        logger.info('Test completed successfully');
        logger.info('Results:', results);
      } else {
        logger.error('Test failed:', results.error);
      }
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSingleUpload };
