import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { RegisterSchema, LoginSchema, RefreshSchema } from '../schemas/auth.js'
import { query } from '../db/client.js'
import { config } from '../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: object, options?: object) => string
      verify: <T>(token: string) => T
      refresh: {
        sign: (payload: object, options?: object) => string
        verify: <T>(token: string) => T
      }
    }
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { email, password, displayName, mode } = result.data

    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: 'Bu e-posta zaten kayıtlı' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (email, display_name, mode, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, displayName, mode, passwordHash]
    )

    const userId = rows[0].id
    const accessToken = fastify.jwt.sign(
      { sub: userId, email },
      { expiresIn: config.jwt.accessExpiresIn }
    )
    const refreshToken = fastify.jwt.refresh.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: config.jwt.refreshExpiresIn }
    )

    return reply.status(201).send({ accessToken, refreshToken, userId })
  })

  fastify.post('/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() })
    }

    const { email, password } = result.data

    const { rows } = await query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    )

    if (rows.length === 0) {
      return reply.status(401).send({ error: 'E-posta veya şifre hatalı' })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'E-posta veya şifre hatalı' })
    }

    await query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id])

    const accessToken = fastify.jwt.sign(
      { sub: user.id, email },
      { expiresIn: config.jwt.accessExpiresIn }
    )
    const refreshToken = fastify.jwt.refresh.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: config.jwt.refreshExpiresIn }
    )

    return { accessToken, refreshToken, userId: user.id }
  })

  fastify.post('/refresh', async (request, reply) => {
    const result = RefreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'refreshToken gerekli' })
    }

    try {
      const payload = fastify.jwt.refresh.verify<{ sub: string; type: string }>(
        result.data.refreshToken
      )

      if (payload.type !== 'refresh') {
        return reply.status(401).send({ error: 'Geçersiz bağlantı' })
      }

      const { rows } = await query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [payload.sub]
      )

      if (rows.length === 0) {
        return reply.status(401).send({ error: 'Kullanıcı bulunamadı' })
      }

      const accessToken = fastify.jwt.sign(
        { sub: payload.sub, email: rows[0].email },
        { expiresIn: config.jwt.accessExpiresIn }
      )

      return { accessToken }
    } catch {
      return reply.status(401).send({ error: 'Bağlantının süresi dolmuş, tekrar isteyin' })
    }
  })

  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string }
    if (!email) return reply.status(400).send({ error: 'E-posta adresi gerekli' })

    const { rows } = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email])
    // Always return 200 to prevent email enumeration
    if (rows.length === 0) return { success: true }

    const { randomBytes } = await import('crypto')
    const token = randomBytes(32).toString('hex')
    const userId = rows[0].id

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, token]
    )

    // TODO: Send email via Resend when RESEND_API_KEY is set
    // Deep link: brainlongevity://reset-password?token=TOKEN
    const resetLink = `brainlongevity://reset-password?token=${token}`

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'BrainLongevity <noreply@brainlongevity.app>',
          to: [email],
          subject: 'Şifre Sıfırlama',
          html: `<p>Şifrenizi sıfırlamak için <a href="${resetLink}">bu bağlantıya</a> tıklayın.</p><p>Bağlantı 1 saat geçerlidir.</p>`,
        }),
      }).catch(console.error)
    } else {
      console.log('[DEV] Password reset link:', resetLink)
    }

    return { success: true }
  })

  fastify.post('/reset-password', async (request, reply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string }
    if (!token || !newPassword || newPassword.length < 8) {
      return reply.status(400).send({ error: 'Geçersiz istek' })
    }

    const { rows } = await query<{ id: string; user_id: string; expires_at: string; used: boolean }>(
      'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
      [token]
    )

    if (rows.length === 0 || rows[0].used || new Date(rows[0].expires_at) < new Date()) {
      return reply.status(400).send({ error: 'Bağlantı geçersiz veya süresi dolmuş' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id])
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [rows[0].id])

    return { success: true }
  })
}
