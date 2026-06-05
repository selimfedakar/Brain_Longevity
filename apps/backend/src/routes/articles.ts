import type { FastifyInstance } from 'fastify'
import { query } from '../db/client.js'

interface Article {
  id: string
  title: string
  authors: string
  year: number
  journal: string
  doi_link: string | null
  category: string
  game_id: string | null
  user_summary: string
  academic_abstract: string
  created_at: string
}

export async function articleRoutes(fastify: FastifyInstance) {
  fastify.get('/articles', async (request) => {
    const { category } = request.query as { category?: string }
    if (category) {
      const { rows } = await query<Article>(
        'SELECT * FROM articles WHERE category = $1 ORDER BY year DESC',
        [category]
      )
      return { articles: rows }
    }
    const { rows } = await query<Article>('SELECT * FROM articles ORDER BY category, year DESC')
    return { articles: rows }
  })

  fastify.get('/articles/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { rows } = await query<Article>('SELECT * FROM articles WHERE id = $1', [id])
    if (!rows[0]) return reply.status(404).send({ error: 'Bulunamadı' })
    return rows[0]
  })

  fastify.get('/articles/game/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string }
    const { rows } = await query<Article>(
      'SELECT * FROM articles WHERE game_id = $1',
      [gameId]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'Bulunamadı' })
    return rows[0]
  })
}
