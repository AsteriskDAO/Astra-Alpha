const NodeCache = require('node-cache')

// Cache items for 1 hour by default
const cache = new NodeCache({ 
  stdTTL: 60 * 60, // 1 hour in seconds
  checkperiod: 120 // Check for expired entries every 2 minutes
})

class CacheService {
  async get(key) {
    return cache.get(key)
  }

  async set(key, value, ttl = 60 * 60) {
    return cache.set(key, value, ttl)
  }

  async del(key) {
    return cache.del(key)
  }

  generateKey(type, userId) {
    return `${type}:${userId}`
  }

  // Optional: clear all cache
  flush() {
    return cache.flushAll()
  }
}

module.exports = new CacheService() 