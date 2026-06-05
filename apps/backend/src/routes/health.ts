import type { FastifyInstance } from 'fastify'
import { IngestBatchSchema, IngestSingleSchema } from '../schemas/health.js'
import { query } from '../db/client.js'
import { computeSleepScore, computeExerciseScore, computeBrainHealthIndex } from '../lib/health-scores.js'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // POST /health/ingest — tek metrik
  fastify.post('/ingest', async (request, reply) => {
    const result = IngestSingleSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const userId = (request.user as { sub: string }).sub
    const { metricType, value, source, recordedAt } = result.data

    await query(
      `INSERT INTO health_metrics (user_id, metric_type, value, source, recorded_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, metric_type, recorded_at) DO UPDATE SET value = EXCLUDED.value`,
      [userId, metricType, value, source, recordedAt]
    )

    return { success: true }
  })

  // POST /health/ingest/batch — Apple Health / Google Fit toplu yükleme
  fastify.post('/ingest/batch', async (request, reply) => {
    const result = IngestBatchSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const userId = (request.user as { sub: string }).sub
    const { metrics } = result.data

    const client = await (await import('../db/client.js')).getClient()
    try {
      await client.query('BEGIN')
      for (const m of metrics) {
        await client.query(
          `INSERT INTO health_metrics (user_id, metric_type, value, source, recorded_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, metric_type, recorded_at) DO UPDATE SET value = EXCLUDED.value`,
          [userId, m.metricType, m.value, m.source, m.recordedAt]
        )
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    return { success: true, inserted: metrics.length }
  })

  // GET /health/scores?date=YYYY-MM-DD — günlük skorlar
  fastify.get('/scores', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const date = ((request as { query: Record<string, string> }).query.date) ??
      new Date().toISOString().split('T')[0]

    const [sleep, exercise] = await Promise.all([
      computeSleepScore(userId, date),
      computeExerciseScore(userId, date),
    ])

    return { date, sleep, exercise }
  })

  // GET /health/metrics?type=steps&days=7 — metrik geçmişi
  fastify.get('/metrics', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const q = (request as { query: Record<string, string> }).query
    const type = q.type
    const days = parseInt(q.days ?? '7', 10)

    if (!type) return { metrics: [] }

    const { rows } = await query(
      `SELECT metric_type, value, recorded_at
       FROM health_metrics
       WHERE user_id = $1
         AND metric_type = $2
         AND recorded_at >= NOW() - INTERVAL '${Math.min(days, 90)} days'
       ORDER BY recorded_at DESC`,
      [userId, type]
    )
    return { metrics: rows }
  })

  // GET /health/bhi?date=YYYY-MM-DD — Brain Health Index
  fastify.get('/bhi', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const date = ((request as { query: Record<string, string> }).query.date) ??
      new Date().toISOString().split('T')[0]

    const composite = await computeBrainHealthIndex(userId, date)

    const { rows } = await query(
      `SELECT cognitive_score, sleep_score, exercise_score, diet_score, fluency_score, composite_index
       FROM brain_health_index WHERE user_id = $1 AND date = $2`,
      [userId, date]
    )

    return { date, composite, breakdown: rows[0] ?? null }
  })

  // GET /health/bhi/history?days=30 — BHI trend
  fastify.get('/bhi/history', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const days = parseInt(
      ((request as { query: Record<string, string> }).query.days) ?? '30', 10
    )

    const { rows } = await query(
      `SELECT date, composite_index, cognitive_score, sleep_score, exercise_score, diet_score, fluency_score
       FROM brain_health_index
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '${Math.min(days, 365)} days'
       ORDER BY date ASC`,
      [userId]
    )
    return { history: rows }
  })
}
