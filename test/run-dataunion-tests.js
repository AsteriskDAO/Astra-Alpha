const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 DataUnion Test Suite Runner')
console.log('=' * 50)

const testFiles = [
  'dataUnion.test.js',
  'queue-integration.test.js',
  'admin-api.test.js'
]

async function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${testFile}...`)
    console.log('─' * 40)
    
    const testPath = path.join(__dirname, testFile)
    // Use npx mocha directly for better Windows compatibility
    const child = spawn('npx', ['mocha', testPath, '--exit'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..') // Run from project root
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} passed`)
        resolve(true)
      } else {
        console.log(`❌ ${testFile} failed with code ${code}`)
        resolve(false)
      }
    })
    
    child.on('error', (error) => {
      console.error(`💥 Error running ${testFile}:`, error.message)
      reject(error)
    })
  })
}

async function runAllTests() {
  console.log('📋 Test Files to Run:')
  testFiles.forEach(file => console.log(`  • ${file}`))
  
  let passedTests = 0
  let failedTests = 0
  
  for (const testFile of testFiles) {
    try {
      const success = await runTestFile(testFile)
      if (success) {
        passedTests++
      } else {
        failedTests++
      }
    } catch (error) {
      console.error(`💥 Critical error in ${testFile}:`, error.message)
      failedTests++
    }
  }
  
  console.log('\n📊 FINAL TEST RESULTS')
  console.log('=' * 30)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📊 Total: ${testFiles.length}`)
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL DATAUNION TESTS PASSED!')
    console.log('✅ DataUnion system is production-ready')
    process.exit(0)
  } else {
    console.log('\n💥 SOME TESTS FAILED!')
    console.log('❌ DataUnion system needs fixes before production')
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = { runAllTests, runTestFile } 