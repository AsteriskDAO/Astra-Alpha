const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { ethers } = require('ethers');
const connectDB = require('../config/database');
const logger = require('../utils/logger');
const DataUnion = require('../models/dataUnion');
const vana = require('../services/vana');

// Load environment variables
dotenv.config();

async function runVanaRefiner() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Setup wallet for real signature generation
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY environment variable is required');
    }
    
    const provider = new ethers.JsonRpcProvider("https://rpc.moksha.vana.org");
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Find all DataUnion records that haven't been synced to Vana
    const unsyncedRecords = await DataUnion.find({ 'partners.vana.is_synced': false });
    
    logger.info(`Found ${unsyncedRecords.length} records not synced to Vana`);
    
    if (unsyncedRecords.length === 0) {
      logger.info('All records are already synced to Vana');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const dataUnion of unsyncedRecords) {
      try {
        logger.info(`Processing ${dataUnion.data_type} record ${dataUnion.data_id}`);
        
        // For existing data, we need to:
        // 1. Get the file ID from Akave (if we have it stored)
        // 2. Run just the refiner step
        
        // Check if we have Akave retry data with file info
        const akaveRetryData = dataUnion.partners?.akave?.retry_data;
        
        if (!akaveRetryData || !akaveRetryData.fileId) {
          logger.warn(`No file ID found for ${dataUnion.data_id}, skipping`);
          continue;
        }
        
        // Generate real signature for this data
        const signature = await wallet.signMessage("Please sign to retrieve your encryption key");
        
        // Create a minimal state object for Vana with just what's needed for refiner
        const vanaState = {
          fileId: akaveRetryData.fileId,
          data_refined: false, // Force refiner step
          // Skip other stages by marking them as complete
          file_registered: true,
          contribution_proof_requested: true,
          tee_proof_submitted: true,
          reward_claimed: false // We'll do this after refiner
        };
        
        // Use a placeholder URL since we're not re-uploading to Akave
        // The Vana service should be able to work with just the fileId and state
        const placeholderUrl = `https://akave.placeholder/${akaveRetryData.fileId}`;
        
        logger.info(`Running Vana refiner for file ${akaveRetryData.fileId} with real signature`);
        
        // Call Vana service directly to run refiner step
        const vanaResponse = await vana.handleFileUpload(
          placeholderUrl, 
          signature, 
          dataUnion.data_type, 
          vanaState, 
          0 // attempts
        );
        
        if (vanaResponse?.state?.data_refined) {
          // Update DataUnion to mark refiner as complete
          await dataUnion.updatePartnerSync('vana', false, 'Refiner step completed', {
            vanaState: vanaResponse.state,
            refinerCompleted: true,
            timestamp: new Date()
          });
          
          successCount++;
          logger.info(`✅ Refiner completed for ${dataUnion.data_id}`);
        } else {
          // Update with error
          await dataUnion.updatePartnerSync('vana', false, vanaResponse?.message || 'Refiner step failed', {
            vanaState: vanaResponse?.state || vanaState,
            error: vanaResponse?.error,
            refinerCompleted: false
          });
          
          errorCount++;
          logger.error(`❌ Refiner failed for ${dataUnion.data_id}: ${vanaResponse?.message}`);
        }
        
      } catch (error) {
        logger.error(`Error processing ${dataUnion.data_id}:`, error);
        errorCount++;
        
        // Update DataUnion with error
        await dataUnion.updatePartnerSync('vana', false, `Refiner error: ${error.message}`, {
          error: error.message,
          refinerCompleted: false
        });
      }
    }
    
    logger.info(`Vana refiner processing completed!`);
    logger.info(`Successful: ${successCount}`);
    logger.info(`Errors: ${errorCount}`);
    
    // Show updated sync status
    logger.info('Updated sync status:');
    const totalRecords = await DataUnion.countDocuments();
    const vanaSuccess = await DataUnion.countDocuments({ 'partners.vana.is_synced': true });
    const vanaFailed = await DataUnion.countDocuments({ 'partners.vana.is_synced': false });
    
    logger.info(`Total DataUnion records: ${totalRecords}`);
    logger.info(`Vana synced: ${vanaSuccess}`);
    logger.info(`Vana not synced: ${vanaFailed}`);
    
  } catch (error) {
    logger.error('Vana refiner failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the refiner if this script is executed directly
if (require.main === module) {
  runVanaRefiner()
    .then(() => {
      logger.info('Vana refiner completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Vana refiner failed:', error);
      process.exit(1);
    });
}

module.exports = { runVanaRefiner };
