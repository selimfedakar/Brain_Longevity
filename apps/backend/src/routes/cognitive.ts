import type { FastifyInstance } from 'fastify'
import { SubmitSessionSchema, NextGameQuerySchema } from '../schemas/cognitive.js'
import { query } from '../db/client.js'
import {
  calculatePerformanceScore,
  updateELO,
  selectNextGame,
  type Domain,
} from '../lib/elo.js'

export async function cognitiveRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Oturum açmanız gerekiyor' })
    }
  })

  fastify.post('/session', async (request, reply) => {
    const result = SubmitSessionSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { gameType, domain, totalTrials, correctTrials, avgResponseMs, difficultyRating } =
      result.data
    const userId = (request.user as { sub: string }).sub
    const accuracy = (correctTrials / totalTrials) * 100

    const { rows: ratingRows } = await query<{ elo_rating: number }>(
      `INSERT INTO cognitive_ratings (user_id, domain)
       VALUES ($1, $2)
       ON CONFLICT (user_id, domain) DO UPDATE SET updated_at = NOW()
       RETURNING elo_rating`,
      [userId, domain]
    )

    const currentELO = ratingRows[0]?.elo_rating ?? 1000
    const perfScore = calculatePerformanceScore(accuracy, avgResponseMs, domain as Domain)
    const { newELO, delta } = updateELO(currentELO, difficultyRating, perfScore)

    await query(
      `UPDATE cognitive_ratings
       SET elo_rating = $1, games_played = games_played + 1, updated_at = NOW()
       WHERE user_id = $2 AND domain = $3`,
      [newELO, userId, domain]
    )

    const { rows: sessionRows } = await query<{ id: string }>(
      `INSERT INTO cognitive_sessions
         (user_id, game_type, domain, difficulty_rating, total_trials,
          correct_trials, avg_response_ms, elo_before, elo_after, elo_delta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        userId, gameType, domain, difficultyRating, totalTrials,
        correctTrials, avgResponseMs, currentELO, newELO, delta,
      ]
    )

    return {
      sessionId: sessionRows[0].id,
      eloBefore: currentELO,
      eloAfter: newELO,
      eloDelta: delta,
      accuracy: Math.round(accuracy * 100) / 100,
      performanceScore: Math.round(perfScore * 100) / 100,
    }
  })

  fastify.get('/ratings', async (request) => {
    const userId = (request.user as { sub: string }).sub

    const { rows } = await query<{
      domain: string
      elo_rating: number
      games_played: number
      updated_at: string
    }>(
      `SELECT domain, elo_rating, games_played, updated_at
       FROM cognitive_ratings
       WHERE user_id = $1
       ORDER BY domain`,
      [userId]
    )

    return { ratings: rows }
  })

  fastify.get('/next-game', async (request, reply) => {
    const queryResult = NextGameQuerySchema.safeParse(
      (request as { query: unknown }).query
    )
    if (!queryResult.success) {
      return reply.status(400).send({ error: 'Geçerli bir domain parametresi gerekli' })
    }

    const { domain } = queryResult.data
    const userId = (request.user as { sub: string }).sub

    const { rows: ratingRows } = await query<{ elo_rating: number }>(
      'SELECT elo_rating FROM cognitive_ratings WHERE user_id = $1 AND domain = $2',
      [userId, domain]
    )
    const userELO = ratingRows[0]?.elo_rating ?? 1000

    const { rows: recentRows } = await query<{ game_type: string }>(
      `SELECT game_type FROM cognitive_sessions
       WHERE user_id = $1 AND domain = $2
       ORDER BY created_at DESC LIMIT 3`,
      [userId, domain]
    )
    const recentTypes = recentRows.map((r) => r.game_type)

    const nextGame = selectNextGame(userELO, domain as Domain, recentTypes)

    return { domain, userELO, nextGame }
  })
}
