import type { FastifyInstance } from 'fastify'
import { query } from '../db/client.js'
import { computeBrainHealthIndex } from '../lib/health-scores.js'
import { redis } from '../lib/redis-client.js'

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // GET /dashboard/today — dashboard için tüm veriler tek çağrıda
  fastify.get('/today', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const today = new Date().toISOString().split('T')[0]

    const cacheKey = `bl:dash:${userId}:${today}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    } catch { /* cache miss is fine */ }

    const composite = await computeBrainHealthIndex(userId, today)

    const { rows: bhiRows } = await query(
      `SELECT cognitive_score, sleep_score, exercise_score, diet_score, fluency_score, composite_index
       FROM brain_health_index WHERE user_id = $1 AND date = $2`,
      [userId, today]
    )

    // Streak: ardışık kaç gün en az 1 aktivite var (cognitive, voice, diet, health)
    const { rows: streakRows } = await query<{ streak: number }>(
      `WITH dates AS (
         SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS day
         FROM cognitive_sessions WHERE user_id = $1
         UNION
         SELECT DISTINCT DATE(recorded_at AT TIME ZONE 'UTC') AS day
         FROM voice_sessions WHERE user_id = $1
         UNION
         SELECT DISTINCT date::date AS day
         FROM diet_logs WHERE user_id = $1
         UNION
         SELECT DISTINCT DATE(recorded_at AT TIME ZONE 'UTC') AS day
         FROM health_metrics WHERE user_id = $1
       ),
       numbered AS (
         SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn FROM dates
       )
       SELECT COUNT(*)::int AS streak FROM numbered
       WHERE day = CURRENT_DATE - (rn - 1)::integer`,
      [userId]
    )

    const bhi = bhiRows[0]
    const result = {
      date: today,
      bhi: bhi?.composite_index ?? composite,
      streak: streakRows[0]?.streak ?? 0,
      cognitive: bhi?.cognitive_score ?? 0,
      sleep: bhi?.sleep_score ?? 0,
      exercise: bhi?.exercise_score ?? 0,
      diet: bhi?.diet_score ?? 0,
      fluency: bhi?.fluency_score ?? 0,
    }

    try {
      await redis.set(cacheKey, JSON.stringify(result), { EX: 1800 }) // 30 minutes
    } catch { /* silently skip if Redis is unavailable */ }

    return result
  })

  // GET /dashboard/weekly — 7 günlük BHI trend
  fastify.get('/weekly', async (request) => {
    const userId = (request.user as { sub: string }).sub

    const { rows } = await query(
      `SELECT date, composite_index as bhi
       FROM brain_health_index
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '7 days'
       ORDER BY date ASC`,
      [userId]
    )
    return { weekly: rows }
  })
}
