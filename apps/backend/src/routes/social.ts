import type { FastifyInstance } from 'fastify'
import { query } from '../db/client.js'

interface JWTPayload { sub: string }

async function requireAuth(fastify: FastifyInstance, request: Parameters<FastifyInstance['authenticate']>[0], reply: Parameters<FastifyInstance['authenticate']>[1]) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Oturum açmanız gerekiyor' })
  }
}

export async function socialRoutes(fastify: FastifyInstance) {
  // ── Kullanıcı arama ─────────────────────────────────────────────────────────
  fastify.get('/search', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub
    const q = (request.query as { q?: string }).q ?? ''
    if (q.length < 2) return reply.status(400).send({ error: 'Min 2 karakter girin' })

    const { rows } = await query<{ id: string; display_name: string; mode: string }>(
      `SELECT id, display_name, mode
         FROM users
        WHERE display_name ILIKE $1
          AND id != $2
        LIMIT 20`,
      [`%${q}%`, userId]
    )
    return rows
  })

  // ── Arkadaşlık isteği gönder ─────────────────────────────────────────────────
  fastify.post('/friend-request', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const requesterId = (request.user as JWTPayload).sub
    const { addresseeId } = request.body as { addresseeId: string }

    if (!addresseeId) return reply.status(400).send({ error: 'addresseeId gerekli' })
    if (addresseeId === requesterId) return reply.status(400).send({ error: 'Kendinize istek gönderemezsiniz' })

    const existing = await query(
      `SELECT id, status FROM friendships
        WHERE (requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    )
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: 'Zaten bir bağlantı mevcut' })
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2) RETURNING id`,
      [requesterId, addresseeId]
    )
    return reply.status(201).send({ id: rows[0].id })
  })

  // ── İsteği kabul et ──────────────────────────────────────────────────────────
  fastify.put('/friend-request/:id/accept', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub
    const { id } = request.params as { id: string }

    const result = await query(
      `UPDATE friendships SET status = 'accepted'
        WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [id, userId]
    )
    if (result.rowCount === 0) return reply.status(404).send({ error: 'İstek bulunamadı' })
    return { ok: true }
  })

  // ── Arkadaşlığı sil ──────────────────────────────────────────────────────────
  fastify.delete('/friend/:id', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub
    const { id } = request.params as { id: string }

    await query(
      `DELETE FROM friendships
        WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)`,
      [id, userId]
    )
    return { ok: true }
  })

  // ── Bekleyen istekler ─────────────────────────────────────────────────────────
  fastify.get('/friend-requests', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub

    const { rows } = await query<{
      id: string; requester_name: string; requester_id: string; created_at: string
    }>(
      `SELECT f.id, u.display_name AS requester_name, u.id AS requester_id, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.requester_id
        WHERE f.addressee_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC`,
      [userId]
    )
    return rows
  })

  // ── Arkadaş listesi (BHI dahil) ───────────────────────────────────────────────
  fastify.get('/friends', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub

    const { rows } = await query<{
      friendship_id: string
      friend_id: string
      display_name: string
      mode: string
      bhi: number | null
    }>(
      `SELECT f.id AS friendship_id,
              u.id AS friend_id,
              u.display_name,
              u.mode,
              b.composite_index AS bhi
         FROM friendships f
         JOIN users u
           ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         LEFT JOIN brain_health_index b
           ON b.user_id = u.id AND b.date = CURRENT_DATE
        WHERE (f.requester_id = $1 OR f.addressee_id = $1)
          AND f.status = 'accepted'
        ORDER BY b.composite_index DESC NULLS LAST`,
      [userId]
    )
    return rows
  })

  // ── Liderlik tablosu (arkadaşlar + kendim) ────────────────────────────────────
  fastify.get('/leaderboard', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub

    const { rows } = await query<{
      user_id: string; display_name: string; bhi: number | null; rank: number
    }>(
      `WITH friends AS (
         SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
           FROM friendships
          WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
       ),
       pool AS (
         SELECT id FROM users WHERE id = $1
         UNION
         SELECT friend_id FROM friends
       )
       SELECT u.id AS user_id,
              u.display_name,
              b.composite_index AS bhi,
              RANK() OVER (ORDER BY b.composite_index DESC NULLS LAST) AS rank
         FROM pool p
         JOIN users u ON u.id = p.id
         LEFT JOIN brain_health_index b ON b.user_id = u.id AND b.date = CURRENT_DATE
        ORDER BY rank`,
      [userId]
    )
    return rows
  })

  // ── Meydan okumalar ───────────────────────────────────────────────────────────
  fastify.get('/challenges', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub

    const { rows } = await query<{
      id: string; title: string; type: string; target: number
      start_date: string; end_date: string
      creator_name: string
      participant_count: number
      joined: boolean
    }>(
      `SELECT c.id, c.title, c.type, c.target,
              c.start_date, c.end_date,
              u.display_name AS creator_name,
              COUNT(cp.user_id) AS participant_count,
              EXISTS(SELECT 1 FROM challenge_participants WHERE challenge_id = c.id AND user_id = $1) AS joined
         FROM challenges c
         JOIN users u ON u.id = c.creator_id
         LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
        WHERE c.end_date >= CURRENT_DATE
        GROUP BY c.id, u.display_name
        ORDER BY c.start_date DESC`,
      [userId]
    )
    return rows
  })

  fastify.post('/challenges', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub
    const { title, type, target, startDate, endDate } = request.body as {
      title: string; type: string; target: number; startDate: string; endDate: string
    }

    if (!title || !type || !target || !startDate || !endDate) {
      return reply.status(400).send({ error: 'Tüm alanlar gerekli' })
    }

    const { rows } = await query<{ id: string }>(
      `INSERT INTO challenges (creator_id, title, type, target, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, title, type, target, startDate, endDate]
    )
    const challengeId = rows[0].id

    // Oluşturan kişiyi otomatik katıl
    await query(
      `INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [challengeId, userId]
    )

    return reply.status(201).send({ id: challengeId })
  })

  fastify.post('/challenges/:id/join', async (request, reply) => {
    await requireAuth(fastify, request, reply)
    const userId = (request.user as JWTPayload).sub
    const { id } = request.params as { id: string }

    const challenge = await query('SELECT id FROM challenges WHERE id = $1 AND end_date >= CURRENT_DATE', [id])
    if (challenge.rows.length === 0) return reply.status(404).send({ error: 'Meydan okuma bulunamadı' })

    await query(
      `INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, userId]
    )
    return { ok: true }
  })
}
