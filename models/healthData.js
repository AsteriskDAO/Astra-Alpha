
const userSchema = {
    "user_id": "uuid",
    "telegram_id": "123456789",
    "user_hash": "hashed_uuid",
    "wallet_address": "string (nullable)", 
    "proof_of_passport_id": "string (hashed)",
    "name": "string",
    "nickname": "string (anonymous check-in identifier)",
    "points": 100,
    "created_at": "ISO 8601 datetime",
    "updated_at": "ISO 8601 datetime"
  }

const healthDataSchema = {
    "user_hash": "hashed_uuid",
    "healthDataId": "uuid",
    "research_opt_in": true,
    "age": "30-35", // 5 year range
    "ethnicity": "string",
    "location": "string (country/state only)",
    "timestamp": "ISO 8601 datetime",
  }

const checkInSchema = {
    "user_hash": "hashed_uuid",
    "is_pregnant": false,
    "timestamp": "ISO 8601 datetime",
    "mood": "good",
    "health_comment": "Feeling fine today", // could be risky to allow free text
    "doctor_visit": false,
    "medication_update": false,
    "diagnosis_update": false,
    "response_type": "text",
    "disease_states": [
      {  
        "condition_name": "string",
        "is_self_diagnosed": true,
      }
    ],
    "medications": [
      {
        "med_name": "string (from OpenPIL/Open FDA)",
        "verified": true,
      }
    ], 
    "vernai_analysis": {},
}

    async function storeHealthData(data) {
        // Store the health data in Akave
        // await akaveClient.upload('healthData', data.user_hash, data);
        // console.log('Health data stored in Akave!');
    }

module.exports = {
    storeHealthData
};
