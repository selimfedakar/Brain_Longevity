import { query } from '../db/client.js'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

// ── Sleep Score (0-100) ────────────────────────────────────────────────────
// Sources: deep_sleep_min, rem_sleep_min, total_sleep_min, sleep_efficiency
export async function computeSleepScore(userId: string, date: string): Promise<number> {
  const { rows } = await query<{ metric_type: string; value: number }>(
    `SELECT metric_type, value FROM health_metrics
     WHERE user_id = $1
       AND metric_type IN ('deep_sleep_min','rem_sleep_min','total_sleep_min','sleep_efficiency')
       AND DATE(recorded_at AT TIME ZONE 'UTC') = $2
     ORDER BY recorded_at DESC`,
    [userId, date]
  )

  const latest: Record<string, number> = {}
  for (const r of rows) latest[r.metric_type] = r.value

  if (Object.keys(latest).length === 0) return 0

  const deep = latest['deep_sleep_min'] ?? 0
  const rem = latest['rem_sleep_min'] ?? 0
  const total = latest['total_sleep_min'] ?? 0
  const efficiency = latest['sleep_efficiency'] ?? 100

  // Deep ≥90 min optimal, REM ≥90 min optimal
  const deepScore = clamp((deep / 90) * 100, 0, 100)
  const remScore = clamp((rem / 90) * 100, 0, 100)

  // Total sleep 420-540 min (7-9h) optimal
  const durationScore =
    total >= 420 && total <= 540
      ? 100
      : total < 420
      ? clamp((total / 420) * 100, 0, 100)
      : clamp(100 - ((total - 540) / 3), 0, 100)

  // Efficiency ≥85% good
  const effScore = clamp(((efficiency - 50) / 35) * 100, 0, 100)

  return Math.round(deepScore * 0.30 + remScore * 0.25 + durationScore * 0.30 + effScore * 0.15)
}

// ── Exercise Score (0-100) ─────────────────────────────────────────────────
// WHO: 150 min/week moderate OR 75 min/week vigorous → daily target: 22 min moderate
export async function computeExerciseScore(userId: string, date: string): Promise<number> {
  const { rows } = await query<{ metric_type: string; value: number }>(
    `SELECT metric_type, value FROM health_metrics
     WHERE user_id = $1
       AND metric_type IN ('active_minutes_moderate','active_minutes_vigorous','steps')
       AND DATE(recorded_at AT TIME ZONE 'UTC') = $2
     ORDER BY recorded_at DESC`,
    [userId, date]
  )

  const latest: Record<string, number> = {}
  for (const r of rows) latest[r.metric_type] = r.value

  if (Object.keys(latest).length === 0) return 0

  const moderate = latest['active_minutes_moderate'] ?? 0
  const vigorous = latest['active_minutes_vigorous'] ?? 0
  const steps = latest['steps'] ?? 0

  // Vigorous counts 2x (WHO equivalent)
  const equivalentMin = moderate + vigorous * 2
  const minuteScore = clamp((equivalentMin / 22) * 100, 0, 100)

  // Steps bonus: 8000 steps = 100
  const stepsScore = clamp((steps / 8000) * 100, 0, 100)

  // Weight: 70% activity time, 30% steps
  return Math.round(minuteScore * 0.70 + stepsScore * 0.30)
}

// ── Cognitive Score for a date (0-100, from cognitive_daily_summary) ───────
export async function getDailyCognitiveScore(userId: string, date: string): Promise<number> {
  const { rows } = await query<{ overall_score: number }>(
    `SELECT overall_score FROM cognitive_daily_summary WHERE user_id = $1 AND date = $2`,
    [userId, date]
  )
  return rows[0]?.overall_score ?? 0
}

// ── MIND Diet Score (0-100, normalised from 0-15) ─────────────────────────
export async function getMINDDietScore(userId: string, date: string): Promise<number> {
  const { rows } = await query<{ mind_score: number }>(
    `SELECT mind_score FROM diet_daily_scores WHERE user_id = $1 AND date = $2`,
    [userId, date]
  )
  const raw = rows[0]?.mind_score ?? 0
  return Math.round((raw / 15) * 100)
}

// ── Latest Fluency Score ───────────────────────────────────────────────────
export async function getLatestFluencyScore(userId: string): Promise<number> {
  const { rows } = await query<{ score: number }>(
    `SELECT score FROM fluency_score_history
     WHERE user_id = $1 ORDER BY date DESC LIMIT 1`,
    [userId]
  )
  return rows[0]?.score ?? 0
}

// ── Compute & Upsert Brain Health Index ───────────────────────────────────
export async function computeBrainHealthIndex(
  userId: string,
  date: string
): Promise<number> {
  const [cognitive, sleep, exercise, diet, fluency] = await Promise.all([
    getDailyCognitiveScore(userId, date),
    computeSleepScore(userId, date),
    computeExerciseScore(userId, date),
    getMINDDietScore(userId, date),
    getLatestFluencyScore(userId),
  ])

  const composite = Math.round(
    cognitive * 0.30 +
    sleep     * 0.25 +
    exercise  * 0.20 +
    diet      * 0.15 +
    fluency   * 0.10
  )

  await query(
    `INSERT INTO brain_health_index
       (user_id, date, cognitive_score, sleep_score, exercise_score, diet_score, fluency_score, composite_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, date) DO UPDATE SET
       cognitive_score = EXCLUDED.cognitive_score,
       sleep_score     = EXCLUDED.sleep_score,
       exercise_score  = EXCLUDED.exercise_score,
       diet_score      = EXCLUDED.diet_score,
       fluency_score   = EXCLUDED.fluency_score,
       composite_index = EXCLUDED.composite_index`,
    [userId, date, cognitive, sleep, exercise, diet, fluency, composite]
  )

  return composite
}
