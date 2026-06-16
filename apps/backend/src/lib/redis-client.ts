import { createClient } from 'redis'
import { config } from '../config.js'

export const redis = createClient({ url: config.redisUrl })

redis.on('error', (err) => console.error('Redis error:', err))

redis.connect().catch((err) => {
  console.error('Redis connection failed — caching disabled:', err.message)
})
