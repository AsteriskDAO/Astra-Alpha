# Asterisk Health Profile - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [API Endpoints](#api-endpoints)
5. [Data Schemas](#data-schemas)
6. [Vana Integration](#vana-integration)
7. [Akave Integration](#akave-integration)
8. [Security Features](#security-features)
9. [Queue System](#queue-system)
10. [Telegram Bot](#telegram-bot)
11. [Mini App](#mini-app)
12. [Deployment](#deployment)

---

## Project Overview

**Asterisk Health Profile** is a comprehensive platform for collecting and storing women's health data. The platform is built on decentralized infrastructure using the **Akave** and **Vana** protocols, providing a Web2-like user experience while maintaining data privacy and ownership.

### Key Features
- **Telegram Bot**: User registration and daily check-ins
- **Mini App**: Comprehensive health profile management
- **Self.xyz Integration**: Zero-knowledge proof identity verification
- **Encrypted Data Storage**: OpenPGP encryption on Akave O3 storage
- **Data Union**: Vana data liquidity pool integration
- **Reward System**: Points-based incentives for data contribution

---

## Architecture

### Service Architecture

The application follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram Bot  │    │   Mini App      │    │   API Server    │
│   (User Input)  │    │   (Health Data) │    │   (Express.js)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Queue System (Bull)               │
         │  • Health Data Upload                          │
         │  • Check-in Data Upload                        │
         │  • Retry Mechanisms                            │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Data Processing Layer              │
         │  • Akave Service (O3 Storage)                  │
         │  • Vana Service (Data Union)                   │
         │  • Encryption/Decryption                       │
         └─────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Queue System**: Bull with Redis
- **Encryption**: OpenPGP.js
- **Blockchain**: Ethers.js for Vana contracts

**Frontend (Mini App):**
- **Framework**: Vue.js 3 with TypeScript
- **UI Library**: Vuetify 3
- **State Management**: Pinia
- **Routing**: Vue Router
- **Build Tool**: Vite

**Infrastructure:**
- **Storage**: Akave O3 (S3-compatible)
- **Data Union**: Vana Protocol
- **Identity**: Self.xyz for ZK proofs
- **Deployment**: Fly.io

---

## Data Flow

### 1. User Registration Flow
```
User → Telegram Bot → API Server → MongoDB → Self.xyz Verification → User Created
```

### 2. Health Data Collection Flow
```
User → Mini App → API Server → Queue System → Akave Encryption → O3 Storage → Vana Registration → TEE Proof → Reward Claim
```

### 3. Daily Check-in Flow
```
User → Telegram Bot → API Server → Queue System → Akave Encryption → O3 Storage → Vana Registration → TEE Proof → Reward Claim
```

---

## API Endpoints

### Base URL
```
https://your-api-domain.com/api
```

### User Management

#### Create User
```http
POST /users/create
Content-Type: application/json
x-telegram-init-data: <telegram-webapp-init-data>

{
  "telegram_id": "string",
  "name": "string",
  "nickname": "string",
  "points": 0
}
```

#### Get User by Telegram ID
```http
GET /users/telegram/:telegramId
x-telegram-init-data: <telegram-webapp-init-data>
```

#### Update User
```http
PUT /users/update
Content-Type: application/json
x-telegram-init-data: <telegram-webapp-init-data>

{
  "telegram_id": "string",
  "name": "string",
  "nickname": "string",
  "health_data": {
    // Health data object
  }
}
```

#### Get User by Hash
```http
GET /users/:userHash
x-telegram-init-data: <telegram-webapp-init-data>
```

#### Update Points
```http
PUT /users/:userHash/points
Content-Type: application/json
x-telegram-init-data: <telegram-webapp-init-data>

{
  "points": 100
}
```

#### Verify Gender
```http
POST /users/verify-gender
Content-Type: application/json

{
  "telegram_id": "string",
  "is_verified": true
}
```

#### Submit Voucher Code
```http
POST /users/submit-voucher-code
Content-Type: application/json

{
  "telegram_id": "string",
  "voucher_code": "string"
}
```

### Check-in Management

#### Create Check-in
```http
POST /checkins/:user_hash
Content-Type: application/json
x-telegram-init-data: <telegram-webapp-init-data>

{
  "mood": "good",
  "health_comment": "Feeling fine today",
  "doctor_visit": false,
  "health_profile_update": false,
  "anxiety_level": "low",
  "anxiety_details": "string",
  "pain_level": 2,
  "pain_details": "string",
  "fatigue_level": 3,
  "fatigue_details": "string"
}
```

#### Get User Check-ins
```http
GET /checkins/:userId
x-telegram-init-data: <telegram-webapp-init-data>
```

### Vana Integration

#### Upload File to Vana
```http
POST /vana/upload/:userId
Content-Type: application/json

{
  "encrypted_file_url": "string",
  "signature": "string",
  "data_type": "health|checkin"
}
```

---

## Data Schemas

### User Schema
```javascript
{
  user_id: "uuid",                    // Unique user identifier
  telegram_id: "string",              // Telegram user ID
  user_hash: "string",                // Hashed user ID
  wallet_address: "string",           // Optional wallet address
  proof_of_passport_id: "string",     // Self.xyz proof ID
  name: "string",                     // User's name
  nickname: "string",                 // Anonymous identifier
  checkIns: 0,                        // Total check-ins count
  points: 0,                          // Reward points
  lastCheckIn: "Date",                // Last check-in timestamp
  created_at: "Date",                 // Account creation date
  updated_at: "Date",                 // Last update date
  isGenderVerified: false,            // Gender verification status
  isRegistered: false,                // Registration completion status
  currentHealthDataId: "string",      // Reference to current health data
  weeklyCheckIns: [{                  // Weekly check-in tracking
    week: "Date",                     // Start of week
    count: 0                          // Check-ins this week
  }],
  averageWeeklyCheckIns: 0            // Average weekly check-ins
}
```

### Health Data Schema
```javascript
{
  healthDataId: "uuid",               // Unique health data identifier
  user_hash: "string",                // User hash reference
  research_opt_in: false,             // Research participation consent
  profile: {
    age_range: "20-25",               // Age range enum
    ethnicity: "string",              // Ethnicity
    location: "string",               // Country/state only
    is_pregnant: false                // Pregnancy status
  },
  conditions: ["string"],             // Health conditions
  medications: ["string"],            // Medications list
  treatments: ["string"],             // Treatments list
  caretaker: ["string"],              // Caretaker information
  timestamp: "Date"                   // Data collection timestamp
}
```

### Check-in Schema
```javascript
{
  user_hash: "string",                // User hash reference
  timestamp: "Date",                  // Check-in timestamp
  mood: "string",                     // Mood assessment
  health_comment: "string",           // Health notes
  doctor_visit: false,                // Doctor visit indicator
  health_profile_update: false,       // Profile update indicator
  anxiety_level: "string",            // Anxiety level
  anxiety_details: "string",          // Anxiety details
  pain_level: 0,                      // Pain level (0-10)
  pain_details: "string",             // Pain details
  fatigue_level: 0,                   // Fatigue level (0-10)
  fatigue_details: "string"           // Fatigue details
}
```

### Notification Schema
```javascript
{
  user_id: "string",                  // User identifier
  type: "string",                     // Notification type
  message: "string",                  // Notification message
  sent: false,                        // Delivery status
  created_at: "Date",                 // Creation timestamp
  sent_at: "Date"                     // Delivery timestamp
}
```

---

## Vana Integration

### Overview
Vana is a decentralized data union protocol that enables users to monetize their data while maintaining privacy. The platform integrates with Vana's data liquidity pool for secure data contribution and reward distribution.

### Key Components

#### 1. Smart Contracts
- **Data Liquidity Pool (DLP)**: Manages data contributions and rewards
- **Data Registry**: Registers files and manages permissions
- **TEE Pool**: Handles trusted execution environment proofs

#### 2. Data Upload Process
```javascript
// 1. File Registration
const fileId = await dataRegistryContract.registerFile(
  encryptedFileUrl,
  userSignature,
  dataType
);

// 2. TEE Proof Request
const jobId = await teePoolContract.requestProof(fileId);

// 3. TEE Proof Submission
const proofResponse = await fetch(`${teeUrl}/RunProof`, {
  method: 'POST',
  body: JSON.stringify({
    file_id: fileId,
    encryption_key: signature,
    fixed_iv: fixedIv,
    ephemeral_key: ephemeralKey,
    encrypted_encryption_key: encryptedKey
  })
});

// 4. Data Refinement
const refinementResponse = await fetch(refinementServiceUrl, {
  method: 'POST',
  body: JSON.stringify({
    file_id: fileId,
    encryption_key: signature,
    refiner_id: refinerId
  })
});

// 5. Reward Claim
const claimTx = await dlpContract.requestReward(fileId, 1);
```

#### 3. Configuration
```javascript
vana: {
  rpcUrl: "https://polygon-rpc.com",
  contracts: {
    dlp: "0x...",           // Data Liquidity Pool address
    registry: "0x...",      // Data Registry address
    teePool: "0x..."        // TEE Pool address
  },
  refinementServiceUrl: "https://...",
  refinerIds: {
    checkin: "refiner-id-1",
    health: "refiner-id-2"
  }
}
```

### Security Features
- **TEE Validation**: Trusted execution environment for secure p