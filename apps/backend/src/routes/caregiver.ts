import type { FastifyInstance } from 'fastify'
import { query, getClient } from '../db/client.js'
import { AcceptInviteSchema } from '../schemas/caregiver.js'

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function caregiverRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // POST /caregiver/invite/generate — hasta davet kodu üretir
  fastify.post('/invite/generate', async (request, reply) => {
    const patientId = (request.user as { sub: string }).sub

    // Mevcut geçerli kodu varsa döndür
    const existing = await query<{ code: string; expires_at: string }>(
      `SELECT code, expires_at FROM caregiver_invites
       WHERE patient_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    )
    if (existing.rows.length > 0) {
      return { code: existing.rows[0].code, expiresAt: existing.rows[0].expires_at }
    }

    const code = randomCode()
    const { rows } = await query<{ code: string; expires_at: string }>(
      `INSERT INTO caregiver_invites (patient_id, code)
       VALUES ($1, $2)
       RETURNING code, expires_at`,
      [patientId, code]
    )
    return { code: rows[0].code, expiresAt: rows[0].expires_at }
  })

  // POST /caregiver/invite/accept — bakıcı kodu kabul eder
  fastify.post('/invite/accept', async (request, reply) => {
    const parsed = AcceptInviteSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const caregiverId = (request.user as { sub: string }).sub
    const { code, relationship } = parsed.data

    const invite = await query<{ id: string; patient_id: string }>(
      `SELECT id, patient_id FROM caregiver_invites
       WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [code]
    )
    if (invite.rows.length === 0) {
      return reply.status(404).send({ error: 'Geçersiz veya süresi dolmuş kod' })
    }

    const { id: inviteId, patient_id: patientId } = invite.rows[0]

    if (patientId === caregiverId) {
      return reply.status(400).send({ error: 'Kendi kendinize bakıcı olamazsınız' })
    }

    const client = await getClient()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO caregiver_relationships (patient_user_id, caregiver_user_id, relationship, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (patient_user_id, caregiver_user_id) DO UPDATE
           SET status = 'active', relationship = EXCLUDED.relationship`,
        [patientId, caregiverId, relationship]
      )
      await client.query(
        `UPDATE caregiver_invites SET used_at = NOW() WHERE id = $1`,
        [inviteId]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    const patient = await query<{ display_name: string; email: string }>(
      `SELECT display_name, email FROM users WHERE id = $1`,
      [patientId]
    )
    return { success: true, patient: patient.rows[0] }
  })

  // GET /caregiver/patients — bakıcının takip ettiği hastalar
  fastify.get('/patients', async (request) => {
    const caregiverId = (request.user as { sub: string }).sub
    const { rows } = await query<{
      link_id: string
      patient_id: string
      display_name: string
      email: string
      relationship: string
      linked_at: string
    }>(
      `SELECT cr.id as link_id, u.id as patient_id, u.display_name, u.email,
              cr.relationship, cr.created_at as linked_at
       FROM caregiver_relationships cr
       JOIN users u ON u.id = cr.patient_user_id
       WHERE cr.caregiver_user_id = $1 AND cr.status = 'active'
       ORDER BY cr.created_at DESC`,
      [caregiverId]
    )
    return { patients: rows }
  })

  // GET /caregiver/my-caregivers — hastanın bakıcıları
  fastify.get('/my-caregivers', async (request) => {
    const patientId = (request.user as { sub: string }).sub
    const { rows } = await query<{
      link_id: string
      caregiver_id: string
      display_name: string
      email: string
      relationship: string
      linked_at: string
    }>(
      `SELECT cr.id as link_id, u.id as caregiver_id, u.display_name, u.email,
              cr.relationship, cr.created_at as linked_at
       FROM caregiver_relationships cr
       JOIN users u ON u.id = cr.caregiver_user_id
       WHERE cr.patient_user_id = $1 AND cr.status = 'active'
       ORDER BY cr.created_at DESC`,
      [patientId]
    )
    return { caregivers: rows }
  })

  // GET /caregiver/patient/:patientId/summary — bakıcı hasta özetini görür
  fastify.get('/patient/:patientId/summary', async (request, reply) => {
    const caregiverId = (request.user as { sub: string }).sub
    const { patientId } = request.params as { patientId: string }

    const access = await query(
      `SELECT id FROM caregiver_relationships
       WHERE caregiver_user_id = $1 AND patient_user_id = $2 AND status = 'active'`,
      [caregiverId, patientId]
    )
    if (access.rows.length === 0) {
      return reply.status(403).send({ error: 'Erişim yetkiniz yok' })
    }

    const [patient, bhi, cognitive, diet, fluency] = await Promise.all([
      query<{ display_name: string; last_active: string }>(
        `SELECT display_name, last_active FROM users WHERE id = $1`,
        [patientId]
      ),
      query<{ date: string; composite_index: number }>(
        `SELECT date, composite_index FROM brain_health_index
         WHERE user_id = $1 ORDER BY date DESC LIMIT 14`,
        [patientId]
      ),
      query<{ date: string; overall_score: number; sessions_completed: number }>(
        `SELECT date, overall_score, sessions_completed FROM cognitive_daily_summary
         WHERE user_id = $1 ORDER BY date DESC LIMIT 7`,
        [patientId]
      ),
      query<{ date: string; mind_score: number }>(
        `SELECT date, mind_score FROM diet_daily_scores
         WHERE user_id = $1 ORDER BY date DESC LIMIT 7`,
        [patientId]
      ),
      query<{ date: string; score: number; trend_7d: number }>(
        `SELECT date, score, trend_7d FROM fluency_score_history
         WHERE user_id = $1 ORDER BY date DESC LIMIT 7`,
        [patientId]
      ),
    ])

    return {
      patient: patient.rows[0],
      bhi: bhi.rows,
      cognitive: cognitive.rows,
      diet: diet.rows,
      fluency: fluency.rows,
    }
  })

  // DELETE /caregiver/link/:linkId — bağlantıyı kaldır (hasta veya bakıcı)
  fastify.delete('/link/:linkId', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { linkId } = request.params as { linkId: string }

    const { rowCount } = await query(
      `UPDATE caregiver_relationships SET status = 'revoked'
       WHERE id = $1 AND (patient_user_id = $2 OR caregiver_user_id = $2)`,
      [linkId, userId]
    )
    if (!rowCount) return reply.status(404).send({ error: 'Bağlantı bulunamadı' })
    return { success: true }
  })
}
