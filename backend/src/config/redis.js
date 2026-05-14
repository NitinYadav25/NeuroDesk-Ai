const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  constructor() {
    this.client = null;
    this.available = false;
  }

  async initialize() {
    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        if (this.available) {
          console.log(`⚠️  Redis connection lost (${err.message})`);
          this.available = false;
        }
      });

      this.client.on('connect', () => {
        this.available = true;
        console.log('✅ Redis Cache connected successfully');
      });

      // Simple ping to verify
      await this.client.ping();
    } catch (err) {
      this.available = false;
      console.log(`⚠️  Redis unavailable (${err.message}) - caching disabled`);
    }
  }

  async get(key) {
    if (!this.available) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.available) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {}
  }

  async del(key) {
    if (!this.available) return;
    try {
      await this.client.del(key);
    } catch {}
  }
}

const redisService = new RedisService();
module.exports = redisService;
