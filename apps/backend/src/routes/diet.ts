import type { FastifyInstance } from 'fastify'
import { LogDietSchema, NEGATIVE_CATEGORIES } from '../schemas/diet.js'
import { query } from '../db/client.js'

// MIND diet scoring thresholds (servings/week per category)
const MIND_THRESHOLDS: Record<string, { target: number; isNegative?: boolean }> = {
  leafy_greens:       { target: 6 },   // ≥6/week = 1 pt
  other_vegetables:   { target: 1 },   // ≥1/day = 7/week → use daily target 1
  nuts:               { target: 5 },
  berries:            { target: 2 },
  beans:              { target: 4 },
  whole_grains:       { target: 3 },   // ≥3/day = 21 → daily target 3
  fish:               { target: 1 },
  poultry:            { target: 2 },
  olive_oil:          { target: 1 },   // primary oil = 1 pt (binary)
  wine:               { target: 1 },   // ≤1/day
  // Negative: consumed LESS than threshold = 1 pt
  red_meat:           { target: 4, isNegative: true },    // <4/week = 1 pt
  butter_margarine:   { target: 1, isNegative: true },    // <1/day
  cheese:             { target: 1, isNegative: true },
  pastries_sweets:    { target: 5, isNegative: true },
  fried_fast_food:    { target: 1, isNegative: true },
}

function computeMindScore(weeklyTotals: Record<string, number>): number {
  let score = 0
  for (const [cat, rule] of Object.entries(MIND_THRESHOLDS)) {
    const servings = weeklyTotals[cat] ?? 0
    if (rule.isNegative) {
      if (servings < rule.target) score += 1
    } else {
      if (servings >= rule.target) score += 1
    }
  }
  return score
}

export async function dietRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // POST /diet/log — günlük yiyecek girişleri (upsert)
  fastify.post('/log', async (request, reply) => {
    const result = LogDietSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const userId = (request.user as { sub: string }).sub
    const { date, entries } = result.data

    const client = await (await import('../db/client.js')).getClient()
    try {
      await client.query('BEGIN')

      // Önce o günkü kayıtları sil, yeniden yaz (tam override)
      await client.query(
        `DELETE FROM diet_logs WHERE user_id = $1 AND date = $2`,
        [userId, date]
      )

      for (const e of entries) {
        const isNeg = NEGATIVE_CATEGORIES.has(e.foodCategory)
        await client.query(
          `INSERT INTO diet_logs (user_id, date, food_category, servings, is_negative)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, date, e.foodCategory, e.servings, isNeg]
        )
      }

      // O hafta (Pazartesi–Pazar) MIND skorunu hesapla
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weeklyRows = await client.query<{ food_category: string; total: string }>(
        `SELECT food_category, SUM(servings) AS total
           FROM diet_logs
          WHERE user_id = $1 AND date BETWEEN $2 AND $3
          GROUP BY food_category`,
        [userId, weekStart.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10)]
      )

      const weeklyTotals: Record<string, number> = {}
      for (const r of weeklyRows.rows) {
        weeklyTotals[r.food_category] = parseFloat(r.total)
      }
      const mindScore = computeMindScore(weeklyTotals)

      // Günlük skor tablosuna kaydet
      await client.query(
        `INSERT INTO diet_daily_scores (user_id, date, mind_score)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date) DO UPDATE SET mind_score = EXCLUDED.mind_score`,
        [userId, date, mindScore]
      )

      await client.query('COMMIT')
      return { success: true, mindScore }
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // GET /diet/today?date=YYYY-MM-DD — bugün girilmiş kategoriler
  fastify.get('/today', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { date } = request.query as { date?: string }
    const targetDate = date ?? new Date().toISOString().slice(0, 10)

    const { rows } = await query<{ food_category: string; servings: string; is_negative: boolean }>(
      `SELECT food_category, servings, is_negative
         FROM diet_logs
        WHERE user_id = $1 AND date = $2
        ORDER BY food_category`,
      [userId, targetDate]
    )

    const scoreResult = await query<{ mind_score: string }>(
      `SELECT mind_score FROM diet_daily_scores WHERE user_id = $1 AND date = $2`,
      [userId, targetDate]
    )

    return {
      date: targetDate,
      entries: rows.map(r => ({
        foodCategory: r.food_category,
        servings: parseFloat(r.servings),
        isNegative: r.is_negative,
      })),
      mindScore: scoreResult.rows[0] ? parseFloat(scoreResult.rows[0].mind_score) : null,
    }
  })

  // GET /diet/weekly-report?weekStart=YYYY-MM-DD
  fastify.get('/weekly-report', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { weekStart: ws } = request.query as { weekStart?: string }

    let weekStart: string
    if (ws) {
      weekStart = ws
    } else {
      const d = new Date()
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      weekStart = d.toISOString().slice(0, 10)
    }
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    const weeklyResult = await query<{ food_category: string; total: string }>(
      `SELECT food_category, SUM(servings) AS total
         FROM diet_logs
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY food_category`,
      [userId, weekStart, weekEndStr]
    )

    const weeklyTotals: Record<string, number> = {}
    for (const r of weeklyResult.rows) {
      weeklyTotals[r.food_category] = parseFloat(r.total)
    }
    const mindScore = computeMindScore(weeklyTotals)

    const dailyResult = await query<{ date: string; mind_score: string }>(
      `SELECT date, mind_score FROM diet_daily_scores
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
        ORDER BY date`,
      [userId, weekStart, weekEndStr]
    )

    return {
      weekStart,
      weekEnd: weekEndStr,
      mindScore,
      maxScore: 15,
      categoryTotals: weeklyTotals,
      dailyScores: dailyResult.rows.map(r => ({
        date: r.date,
        score: parseFloat(r.mind_score),
      })),
    }
  })
}
