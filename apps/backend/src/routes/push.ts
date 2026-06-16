import type { FastifyInstance } from 'fastify'
import { query } from '../db/client.js'

export async function pushRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // Register push token
  fastify.post('/token', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const { token, platform } = request.body as { token: string; platform?: string }

    if (!token) return { success: false }

    await query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = $1, updated_at = NOW()`,
      [userId, token, platform ?? 'ios']
    )

    return { success: true }
  })

  // Unregister push token (on logout)
  fastify.delete('/token', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const { token } = request.body as { token: string }
    await query('DELETE FROM push_tokens WHERE user_id = $1 AND token = $2', [userId, token])
    return { success: true }
  })
}
