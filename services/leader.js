const Redis = require('ioredis')
const logger = require('../utils/logger')
const { leaderEvents } = require('./events')

class LeaderElection {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL)
    this.lockKey = 'asterisk:leader-lock'
    this.lockTTL = 30 // 30 seconds
    this.instanceId = Math.random().toString(36).substring(7)
    this.isLeader = false
  }

  async initialize() {
    // Start periodic leader election
    this.startElection()
    
    // Renew leadership if we're the leader
    setInterval(() => {
      if (this.isLeader) {
        this.renewLock()
      }
    }, (this.lockTTL / 2) * 1000)
  }

  async startElection() {
    try {
      // Try to acquire lock
      const acquired = await this.redis.set(
        this.lockKey,
        this.instanceId,
        'NX',
        'EX',
        this.lockTTL
      )

      console.log('acquired', acquired)
      const wasLeader = this.isLeader
      this.isLeader = acquired === 'OK'
      
      if (this.isLeader) {
        logger.info('I am the leader')
        if (!wasLeader) {
          logger.info(`Instance ${this.instanceId} became leader`)
          leaderEvents.emit('newLeader')
        }
      } else {
        if (wasLeader) {
          logger.info(`Instance ${this.instanceId} lost leadership`)
          leaderEvents.emit('lostLeader')
        }
      }

      // If not leader, check again after TTL
      if (!this.isLeader) {
        setTimeout(() => this.startElection(), this.lockTTL * 1000)
      }
    } catch (error) {
      logger.error('Leader election error:', error)
      setTimeout(() => this.startElection(), 5000)
    }
  }

  async renewLock() {
    try {
      // Only renew if we still own the lock
      const result = await this.redis.eval(`
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `, 1, this.lockKey, this.instanceId, this.lockTTL)

      if (!result) {
        this.isLeader = false
        this.startElection()
      }
    } catch (error) {
      logger.error('Lock renewal error:', error)
      this.isLeader = false
      this.startElection()
    }
  }

  isCurrentLeader() {
    return this.isLeader
  }

  async releaseLock() {
    try {
      // Only release if we own the lock
      const result = await this.redis.eval(`
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `, 1, this.lockKey, this.instanceId)
      
      if (result) {
        logger.info('Released leadership lock')
      }
    } catch (error) {
      logger.error('Failed to release lock:', error)
    }
  }
}

// Add graceful shutdown
process.on('SIGTERM', async () => {
  await leader.releaseLock()
  process.exit(0)
})

module.exports = new LeaderElection() 