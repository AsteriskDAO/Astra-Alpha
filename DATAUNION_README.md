# DataUnion System Documentation

## Overview

The DataUnion system tracks the synchronization status of health data and check-ins across different external partners (Akave, Vana, etc.). This provides visibility into data flow and enables automatic retry mechanisms for failed uploads.

## Architecture

```
User Data (CheckIn/HealthData) → DataUnion Tracking → External Partners
     ↓                              ↓                    ↓
MongoDB Storage              Sync Status + Retry    Akave, Vana, etc.
                            Data Storage
```

## DataUnion Model

### Schema
```javascript
{
  user_hash: String,           // Hashed user identifier
  data_type: String,           // 'health' or 'checkin'
  data_id: String,             // Reference to actual data record
  partners: {
    akave: {
      is_synced: Boolean,      // Sync success status
      error_message: String,   // Error details if sync failed
      retry_data: Object       // Encryption keys, signatures, state for retries
    },
    vana: {
      is_synced: Boolean,      // Sync success status
      error_message: String,   // Error details if sync failed
      retry_data: Object       // Upload state, error details for retries
    }
  },
  created_at: Date,
  updated_at: Date
}
```

## Key Features

### 1. **Automatic Sync Tracking**
- Every upload to Akave/Vana is tracked automatically
- Sync status updated in real-time during queue processing
- Error messages stored for debugging failed uploads

### 2. **Retry Data Storage**
- Encryption keys and signatures stored for retry attempts
- Vana upload state preserved for resuming failed uploads
- No need to regenerate encryption keys on retries

### 3. **Admin Tools**
- View sync statistics across all partners
- Retry failed uploads automatically
- Monitor system health and performance

## API Endpoints

### Get Sync Statistics
```http
GET /api/users/admin/sync-stats
```

**Response:**
```json
{
  "total": 150,
  "akave": {
    "success": 145,
    "failed": 5,
    "successRate": 97
  },
  "vana": {
    "success": 140,
    "failed": 10,
    "successRate": 93
  }
}
```

### Retry Failed Syncs
```http
POST /api/users/admin/retry-failed-syncs
Content-Type: application/json

{
  "partner": "vana",
  "dataType": "health"
}
```

**Response:**
```json
{
  "message": "Added 5 failed syncs back to queue for retry",
  "totalFailed": 5,
  "retryCount": 5
}
```

## Queue Integration

The DataUnion system is automatically integrated with your existing queue service:

1. **Job Start**: Creates/finds DataUnion record for tracking
2. **Akave Upload**: Updates sync status and stores retry data
3. **Vana Upload**: Updates sync status and stores retry data
4. **Success/Failure**: Final status update with error details
5. **Retry Logic**: Failed jobs can be retried with stored retry data

## Usage Examples

### Check Sync Status
```javascript
const DataUnion = require('./models/dataUnion')

// Find sync status for specific data
const syncStatus = await DataUnion.findByDataReference(
  userHash, 
  'health', 
  healthDataId
)

console.log('Akave synced:', syncStatus.partners.akave.is_synced)
console.log('Vana synced:', syncStatus.partners.vana.is_synced)
```

### Find Failed Syncs
```javascript
// Find all failed Vana uploads
const failedVanaSyncs = await DataUnion.findFailedSyncs('vana')

// Find failed health data syncs only
const failedHealthSyncs = await DataUnion.findFailedSyncs('vana', 'health')
```

### Update Sync Status
```javascript
// Mark Akave as successfully synced
await dataUnionRecord.updatePartnerSync('akave', true, null, { signature, o3Response })

// Mark Vana as failed with error
await dataUnionRecord.updatePartnerSync('vana', false, 'Upload timeout', { vanaState, error })
```

## Testing

The DataUnion system includes comprehensive testing using **Chai** and **Mocha** in the `test/` folder.

### Test Files

- **`test/dataUnion.test.js`** - Core DataUnion model tests
- **`test/queue-integration.test.js`** - Queue service integration tests
- **`test/admin-api.test.js`** - Admin API endpoint tests
- **`test/run-dataunion-tests.js`** - Comprehensive test runner

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:dataunion      # DataUnion model tests only
npm run test:queue          # Queue integration tests only
npm run test:admin          # Admin API tests only

# Run comprehensive DataUnion test suite
node test/run-dataunion-tests.js

# Run individual test files
npx mocha test/dataUnion.test.js --exit
npx mocha test/queue-integration.test.js --exit
npx mocha test/admin-api.test.js --exit
```

### Test Coverage

The test suite covers:

✅ **Schema validation** - All required fields and data types  
✅ **Partner sync updates** - Akave and Vana sync status management  
✅ **Query methods** - Finding records and failed syncs  
✅ **Data integrity** - Consistency across updates and operations  
✅ **Edge cases** - Error handling and boundary conditions  
✅ **Performance** - Database indexing and query efficiency  
✅ **API endpoints** - Admin functionality and response formats  
✅ **Queue integration** - Sync tracking during upload processes  

## Future Enhancements

### Phase 2: Marketplace Features
- Consent level tracking
- Data quality scoring
- Dynamic pricing
- Purchase analytics
- Usage tracking (when you have a way to monitor it)

### Phase 3: Advanced Partner Management
- Partner-specific data requirements
- Custom validation rules
- Partner performance metrics
- Revenue attribution

## Benefits

✅ **Data Consistency**: Know exactly what data is synced where  
✅ **Automatic Retries**: Failed uploads can be retried automatically  
✅ **Debugging**: Clear error messages and retry data for troubleshooting  
✅ **Analytics**: Foundation for marketplace analytics  
✅ **Scalability**: Easy to add new partners without schema changes  
✅ **MongoDB Flexibility**: Schema evolves as marketplace needs grow  
✅ **Comprehensive Testing**: Production-ready with full test coverage  

## Migration Notes

- **No breaking changes** to existing data models
- **Backward compatible** with current queue system
- **Incremental adoption** - DataUnion records created as needed
- **Easy rollback** if needed (just stop creating DataUnion records)
- **Full test coverage** ensures production reliability

## Production Deployment

### Pre-deployment Checklist

1. **Run all tests**: `npm run test:all`
2. **Verify test coverage**: All tests must pass
3. **Check database indexes**: Ensure proper indexing is in place
4. **Monitor logs**: Watch for DataUnion-related errors
5. **Test admin endpoints**: Verify sync stats and retry functionality

### Monitoring

- **Sync statistics**: Use `/api/users/admin/sync-stats` to monitor system health
- **Failed syncs**: Check for failed uploads and retry as needed
- **Performance**: Monitor query performance and database load
- **Error logs**: Watch for sync failures and retry mechanisms 