const mongoose = require('mongoose');
const CheckIn = require('../models/checkIn');
const DataUnion = require('../models/dataUnion');
require('dotenv').config();

async function fixNullCheckinIds() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all check-ins with null checkinId
    const nullCheckins = await CheckIn.find({ checkinId: null });
    console.log(`Found ${nullCheckins.length} check-ins with null checkinId`);

    if (nullCheckins.length === 0) {
      console.log('No null checkinId records found. Database is clean!');
      return;
    }

    // Fix each null checkinId
    for (const checkin of nullCheckins) {
      const newCheckinId = CheckIn.generateCheckinId();
      console.log(`Fixing check-in ${checkin._id}: null -> ${newCheckinId}`);
      
      // Update the check-in
      await CheckIn.updateOne(
        { _id: checkin._id },
        { checkinId: newCheckinId }
      );

      // Update any associated DataUnion records
      const dataUnion = await DataUnion.findOne({
        data_type: 'checkin',
        data_id: null,
        user_hash: checkin.user_hash
      });

      if (dataUnion) {
        console.log(`Updating DataUnion record ${dataUnion._id} with new checkinId`);
        await DataUnion.updateOne(
          { _id: dataUnion._id },
          { data_id: newCheckinId }
        );
      }
    }

    console.log('✅ Successfully fixed all null checkinId records');

    // Verify the fix
    const remainingNulls = await CheckIn.countDocuments({ checkinId: null });
    console.log(`Remaining null checkinId records: ${remainingNulls}`);

  } catch (error) {
    console.error('Error fixing null checkinIds:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixNullCheckinIds();
