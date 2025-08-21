const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const connectDB = require('../config/database');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();


// Define the old schema structure (what we're migrating from)
const oldCheckInSchema = {
  user_hash: String,
  timestamp: Date,
  mood: String,
  health_comment: String,
  doctor_visit: Boolean,
  health_profile_update: Boolean,
  anxiety_level: String, // This was a string, now number
  anxiety_details: String,
  pain_level: Number,
  pain_details: String,
  fatigue_level: Number,
  fatigue_details: String
};

// Helper function to generate unique checkinId
function generateCheckinId() {
  return `checkin_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

// Helper function to convert string numbers to actual numbers
// Since anxiety_level was stored as strings like "1", "2", "3" but representing numbers
function convertStringToNumber(value) {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    // Check if it's a valid number between 1-5 (assuming that's the range)
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return num;
    }
    // If it's not a valid number in our expected range, return null
    return null;
  }
  
  return null;
}

async function migrateCheckinSchema() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Get the database connection
    const db = mongoose.connection.db;
    
    // Get the checkin collection
    const checkinCollection = db.collection('checkins');
    
    // Find all documents that don't have a checkinId or have string anxiety_level
    const documentsToUpdate = await checkinCollection.find({
      $or: [
        { checkinId: { $exists: false } },
        { anxiety_level: { $type: 'string' } }
      ]
    }).toArray();
    
    logger.info(`Found ${documentsToUpdate.length} documents to migrate`);
    
    if (documentsToUpdate.length === 0) {
      logger.info('No documents need migration. All checkins are already up to date.');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const doc of documentsToUpdate) {
      try {
        const updateData = {};
        
        // Add checkinId if missing
        if (!doc.checkinId) {
          updateData.checkinId = generateCheckinId();
          logger.info(`Adding checkinId to document ${doc._id}: ${updateData.checkinId}`);
        }
        
        // Convert anxiety_level from string to number if needed
        if (typeof doc.anxiety_level === 'string') {
          const convertedValue = convertStringToNumber(doc.anxiety_level);
          if (convertedValue !== null) {
            updateData.anxiety_level = convertedValue;
            logger.info(`Converting anxiety_level for document ${doc._id}: "${doc.anxiety_level}" -> ${convertedValue}`);
          } else {
            logger.warn(`Invalid anxiety_level value for document ${doc._id}: "${doc.anxiety_level}" - skipping conversion`);
          }
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          await checkinCollection.updateOne(
            { _id: doc._id },
            { $set: updateData }
          );
          updatedCount++;
        }
        
      } catch (error) {
        logger.error(`Error updating document ${doc._id}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`Migration completed successfully!`);
    logger.info(`Updated: ${updatedCount} documents`);
    logger.info(`Errors: ${errorCount} documents`);
    
    // Verify the migration by checking a few documents
    logger.info('Verifying migration...');
    const sampleDocs = await checkinCollection.find().limit(5).toArray();
    
    for (const doc of sampleDocs) {
      logger.info(`Document ${doc._id}:`);
      logger.info(`  - checkinId: ${doc.checkinId || 'MISSING'}`);
      logger.info(`  - anxiety_level: ${doc.anxiety_level} (type: ${typeof doc.anxiety_level})`);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateCheckinSchema()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCheckinSchema }; 