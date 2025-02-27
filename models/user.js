
// Import hash functions from utils/hash.js
const { createUserHash } = require('../utils/hash');
const { v4: uuidv4 } = require('uuid');

const userSchema = {
    "user_id": "uuid",
    "telegram_id": "123456789",
    "user_hash": "hashed_uuid",
    "wallet_address": "string (nullable)", 
    "proof_of_passport_id": "string (hashed)",
    "name": "string",
    "nickname": "string (anonymous check-in identifier)",
    "age": 32,
    "ethnicity": "string",
    "location": "string (country/state only)",
    "is_pregnant": false,
    "research_opt_in": true,
    "points": 100,
    "created_at": "ISO 8601 datetime",
    "updated_at": "ISO 8601 datetime"
  }

  async function storeUserData(data) {
    const newUserId = uuidv4();
    console.log('Generated User ID:', newUserId);

    const userHash = createUserHash(newUserId);
    const userData = {
      user_id: newUserId,
      telegram_id: data.telegram_id,
      user_hash: userHash, // Store the hashed user identifier
      proof_of_passport_id: bcrypt.hashSync(data.proof_of_passport_id, 10),
      name: data.name,
      nickname: data.nickname,
      age: data.age,
      ethnicity: data.ethnicity,
      location: data.location,
      is_pregnant: data.is_pregnant,
      research_opt_in: data.research_opt_in,
      points: data.points,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  
    // Store user data in Akave (Assuming Akave storage accepts JSON)
    // await akaveClient.upload('users', userHash, userData); // Store by userHash as the unique key
    // console.log('User data stored in Akave!');
  }

module.exports = {
    storeUserData
};