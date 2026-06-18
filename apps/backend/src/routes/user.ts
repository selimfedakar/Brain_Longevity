import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../db/client.js'

const UpdateProfileSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  cardiovascularRisk: z.number().int().min(1).max(5).optional(),
  hasHearingLoss: z.boolean().optional(),
  hasDiabetes: z.boolean().optional(),
  hasHypertension: z.boolean().optional(),
  socialIsolationScore: z.number().int().min(1).max(10).optional(),
  educationYears: z.number().int().min(0).max(30).optional(),
})

const OnboardingSchema = z.object({
  age: z.number().int().min(1).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sex: z.enum(['male', 'female', 'other']),
  cardiovascularRisk: z.number().int().min(1).max(5),
  hasHearingLoss: z.boolean(),
  hasDiabetes: z.boolean(),
  hasHypertension: z.boolean(),
  socialIsolationScore: z.number().int().min(1).max(10),
  educationYears: z.number().int().min(0).max(30),
  baselineCognitiveScore: z.number().min(0).max(100).optional(),
  disclaimerAccepted: z.literal(true),
})

export async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Oturum açmanız gerekiyor' })
    }
  })

  fastify.get('/profile', async (request) => {
    const userId = (request.user as { sub: string }).sub

    const { rows } = await query<{
      id: string
      email: string
      display_name: string
      mode: string
      created_at: string
      last_active: string
      age: number | null
      sex: string | null
      cardiovascular_risk: number | null
      has_hearing_loss: boolean
      has_diabetes: boolean
      has_hypertension: boolean
      social_isolation_score: number | null
      education_years: number | null
      baseline_cognitive_score: number | null
      disclaimer_accepted_at: string | null
    }>(
      `SELECT u.id, u.email, u.display_name, u.mode, u.created_at, u.last_active,
              p.age, p.sex, p.cardiovascular_risk, p.has_hearing_loss,
              p.has_diabetes, p.has_hypertension, p.social_isolation_score,
              p.education_years, p.baseline_cognitive_score, p.disclaimer_accepted_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    )

    if (rows.length === 0) {
      return { error: 'Kullanıcı bulunamadı' }
    }

    const row = rows[0]
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      mode: row.mode,
      createdAt: row.created_at,
      lastActive: row.last_active,
      profile: {
        age: row.age,
        sex: row.sex,
        cardiovascularRisk: row.cardiovascular_risk,
        hasHearingLoss: row.has_hearing_loss,
        hasDiabetes: row.has_diabetes,
        hasHypertension: row.has_hypertension,
        socialIsolationScore: row.social_isolation_score,
        educationYears: row.education_years,
        baselineCognitiveScore: row.baseline_cognitive_score,
        disclaimerAcceptedAt: row.disclaimer_accepted_at,
        onboardingComplete: !!row.disclaimer_accepted_at,
      },
    }
  })

  fastify.put('/profile', async (request, reply) => {
    const result = UpdateProfileSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const userId = (request.user as { sub: string }).sub
    const d = result.data

    await query(
      `INSERT INTO user_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    )

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (d.age !== undefined) { updates.push(`age = $${idx++}`); values.push(d.age) }
    if (d.sex !== undefined) { updates.push(`sex = $${idx++}`); values.push(d.sex) }
    if (d.cardiovascularRisk !== undefined) { updates.push(`cardiovascular_risk = $${idx++}`); values.push(d.cardiovascularRisk) }
    if (d.hasHearingLoss !== undefined) { updates.push(`has_hearing_loss = $${idx++}`); values.push(d.hasHearingLoss) }
    if (d.hasDiabetes !== undefined) { updates.push(`has_diabetes = $${idx++}`); values.push(d.hasDiabetes) }
    if (d.hasHypertension !== undefined) { updates.push(`has_hypertension = $${idx++}`); values.push(d.hasHypertension) }
    if (d.socialIsolationScore !== undefined) { updates.push(`social_isolation_score = $${idx++}`); values.push(d.socialIsolationScore) }
    if (d.educationYears !== undefined) { updates.push(`education_years = $${idx++}`); values.push(d.educationYears) }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`)
      values.push(userId)
      await query(
        `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = $${idx}`,
        values
      )
    }

    return { success: true }
  })

  fastify.delete('/', async (request) => {
    const userId = (request.user as { sub: string }).sub
    await query('DELETE FROM users WHERE id = $1', [userId])
    return { success: true }
  })

  fastify.post('/onboarding', async (request, reply) => {
    const result = OnboardingSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const userId = (request.user as { sub: string }).sub
    const d = result.data

    await query(
      `INSERT INTO user_profiles
         (user_id, age, birth_date, sex, cardiovascular_risk, has_hearing_loss,
          has_diabetes, has_hypertension, social_isolation_score,
          education_years, baseline_cognitive_score, disclaimer_accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         age = EXCLUDED.age,
         birth_date = EXCLUDED.birth_date,
         sex = EXCLUDED.sex,
         cardiovascular_risk = EXCLUDED.cardiovascular_risk,
         has_hearing_loss = EXCLUDED.has_hearing_loss,
         has_diabetes = EXCLUDED.has_diabetes,
         has_hypertension = EXCLUDED.has_hypertension,
         social_isolation_score = EXCLUDED.social_isolation_score,
         education_years = EXCLUDED.education_years,
         baseline_cognitive_score = EXCLUDED.baseline_cognitive_score,
         disclaimer_accepted_at = NOW(),
         updated_at = NOW()`,
      [
        userId, d.age, d.birthDate ?? null, d.sex, d.cardiovascularRisk, d.hasHearingLoss,
        d.hasDiabetes, d.hasHypertension, d.socialIsolationScore,
        d.educationYears, d.baselineCognitiveScore ?? null,
      ]
    )

    return { success: true, onboardingComplete: true }
  })
}
