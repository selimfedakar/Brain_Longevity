import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'
import { config } from './config.js'
import { pool } from './db/client.js'
import { authRoutes } from './routes/auth.js'
import { cognitiveRoutes } from './routes/cognitive.js'
import { userRoutes } from './routes/user.js'
import { pushRoutes } from './routes/push.js'

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'warn' : 'info',
  },
})

await fastify.register(fastifyMultipart, { limits: { fileSize: 25 * 1024 * 1024 } })

await fastify.register(fastifyCors, {
  origin: config.nodeEnv === 'development' ? true : ['https://brainlongevity.app'],
  credentials: true,
})

await fastify.register(fastifyCookie)

await fastify.register(fastifyJwt, {
  secret: config.jwt.secret,
})

await fastify.register(fastifyJwt, {
  secret: config.jwt.refreshSecret,
  namespace: 'refresh',
  jwtVerify: 'refreshJwtVerify',
  jwtSign: 'refreshJwtSign',
})

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

await fastify.register(authRoutes, { prefix: '/auth' })
await fastify.register(cognitiveRoutes, { prefix: '/cognitive' })
await fastify.register(userRoutes, { prefix: '/user' })
await fastify.register((await import('./routes/health.js')).healthRoutes, { prefix: '/health' })
await fastify.register((await import('./routes/dashboard.js')).dashboardRoutes, { prefix: '/dashboard' })
await fastify.register((await import('./routes/diet.js')).dietRoutes, { prefix: '/diet' })
await fastify.register((await import('./routes/voice.js')).voiceRoutes, { prefix: '/voice' })
await fastify.register((await import('./routes/caregiver.js')).caregiverRoutes, { prefix: '/caregiver' })
await fastify.register((await import('./routes/social.js')).socialRoutes, { prefix: '/social' })
await fastify.register((await import('./routes/articles.js')).articleRoutes, { prefix: '' })
await fastify.register(pushRoutes, { prefix: '/push' })

const shutdown = async () => {
  fastify.log.info('Shutting down...')
  await fastify.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' })
  fastify.log.info(`Server running on port ${config.port}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
