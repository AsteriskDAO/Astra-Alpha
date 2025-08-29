/**
 * Test script for actual API endpoints
 * Creates mock Telegram authentication for testing
 */

const https = require('https')
const http = require('http')
const crypto = require('crypto')

// Mock Telegram bot token for testing
const MOCK_BOT_TOKEN = '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'

// Create mock Telegram init data
function createMockTelegramData() {
  const user = JSON.stringify({
    id: 12345,
    first_name: 'Test',
    username: 'testuser'
  })
  
  const initData = `user=${encodeURIComponent(user)}&auth_date=${Math.floor(Date.now() / 1000)}`
  
  // Create mock hash (this won't be valid but will pass the header check)
  const mockHash = crypto.createHash('md5').update(initData).digest('hex')
  
  return `${initData}&hash=${mockHash}`
}

// Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': createMockTelegramData(),
        ...options.headers
      }
    }
    
    const req = client.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

// Test functions
async function testLeaderboardEndpoints() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing Leaderboard API Endpoints...\n')
  console.log(`Base URL: ${baseUrl}\n`)
  
  try {
    // Test 1: Get top users
    console.log('📊 Test 1: Getting top users...')
    const topUsersResponse = await makeRequest(`${baseUrl}/api/users/leaderboard/top?limit=5`)
    
    console.log(`Status: ${topUsersResponse.statusCode}`)
    if (topUsersResponse.statusCode === 200) {
      console.log('✅ Success! Top users response:')
      console.log(JSON.stringify(topUsersResponse.data, null, 2))
    } else {
      console.log('❌ Failed to get top users:')
      console.log(JSON.stringify(topUsersResponse.data, null, 2))
    }
    
    console.log('\n' + '='.repeat(50) + '\n')
    
    // Test 2: Get user rank (we need a valid user hash)
    console.log('🏆 Test 2: Getting user rank...')
    console.log('Note: This requires a valid user_hash from your database')
    console.log('You can test this with a real user hash from your system')
    
    // Test 3: Test with different pagination
    console.log('\n📄 Test 3: Testing pagination...')
    const paginationResponse = await makeRequest(`${baseUrl}/api/users/leaderboard/top?limit=3&offset=0`)
    
    console.log(`Status: ${paginationResponse.statusCode}`)
    if (paginationResponse.statusCode === 200) {
      console.log('✅ Success! Pagination response:')
      console.log(JSON.stringify(paginationResponse.data, null, 2))
    } else {
      console.log('❌ Failed to get paginated results:')
      console.log(JSON.stringify(paginationResponse.data, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Test server connectivity first
async function testServerConnectivity() {
  console.log('🔍 Testing server connectivity...')
  
  try {
    const response = await makeRequest('http://localhost:3000/api/users/leaderboard/top?limit=1')
    console.log(`✅ Server is responding (Status: ${response.statusCode})`)
    return true
  } catch (error) {
    console.log(`❌ Server connection failed: ${error.message}`)
    console.log('Make sure your server is running on port 3000')
    return false
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...\n')
  
  const isConnected = await testServerConnectivity()
  if (!isConnected) {
    console.log('\n💡 Troubleshooting tips:')
    console.log('1. Make sure your server is running: npm start')
    console.log('2. Check if the server is on port 3000')
    console.log('3. Verify no firewall is blocking the connection')
    return
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  await testLeaderboardEndpoints()
  
  console.log('\n🎉 API endpoint tests completed!')
  console.log('\n💡 Next steps:')
  console.log('1. Test with real user data from your database')
  console.log('2. Integrate with your Telegram bot/mini-app')
  console.log('3. Run database optimization: node scripts/optimize-leaderboard.js')
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { testLeaderboardEndpoints, testServerConnectivity }
