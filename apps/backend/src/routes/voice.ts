import type { FastifyInstance } from 'fastify'
import { Readable } from 'stream'
import OpenAI from 'openai'
import { query } from '../db/client.js'
import { config } from '../config.js'
import { analyzeTranscript, upsertFluencyHistory } from '../lib/fluency-scores.js'
import { PROMPTS, PromptTypeSchema } from '../schemas/voice.js'

function getOpenAI(): OpenAI | null {
  if (!config.openaiApiKey) return null
  return new OpenAI({ apiKey: config.openaiApiKey })
}

export async function voiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Oturum açmanız gerekiyor' }) }
  })

  // GET /voice/prompts?type=free_journal — rastgele prompt getir
  fastify.get('/prompts', async (request, reply) => {
    const { type } = request.query as { type?: string }
    const parsed = PromptTypeSchema.safeParse(type)

    if (!parsed.success) {
      // Rastgele tip seç
      const types = Object.keys(PROMPTS) as (keyof typeof PROMPTS)[]
      const randomType = types[Math.floor(Math.random() * types.length)]
      const prompts = PROMPTS[randomType]
      return {
        type: randomType,
        prompt: prompts[Math.floor(Math.random() * prompts.length)],
        allTypes: types,
      }
    }

    const prompts = PROMPTS[parsed.data]
    return {
      type: parsed.data,
      prompt: prompts[Math.floor(Math.random() * prompts.length)],
      allTypes: Object.keys(PROMPTS),
    }
  })

  // POST /voice/session — ses dosyası yükle, transkribe et, skorla, kaydet
  fastify.post('/session', async (request, reply) => {
    const userId = (request.user as { sub: string }).sub

    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Ses dosyası gerekli' })

    const promptField = data.fields?.promptType
    const promptValue = promptField && !Array.isArray(promptField) && 'value' in promptField
      ? (promptField as { value: string }).value
      : undefined
    const promptType = PromptTypeSchema.safeParse(promptValue)
    if (!promptType.success) return reply.status(400).send({ error: 'Geçersiz prompt tipi' })

    const durField = data.fields?.durationSeconds
    const durValue = durField && !Array.isArray(durField) && 'value' in durField
      ? (durField as { value: string }).value
      : '0'
    const durationSeconds = parseInt(durValue, 10)

    // Ses verisini buffer'a al
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk as Buffer)
    const audioBuffer = Buffer.concat(chunks)

    let transcript = ''
    const openai = getOpenAI()
    if (!openai) {
      return reply.status(503).send({
        error: 'Sesli analiz şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
      })
    }

    if (openai && audioBuffer.length > 0) {
      try {
        const audioFile = new File(
          [audioBuffer],
          `recording.${data.mimetype?.includes('mp4') ? 'm4a' : 'wav'}`,
          { type: data.mimetype ?? 'audio/m4a' }
        )
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'tr',
        })
        transcript = transcription.text
      } catch (e) {
        fastify.log.warn({ err: e }, 'Whisper API hatası')
        // Transkripsiyon başarısız → boş transcript ile devam
      }
    }

    const metrics = analyzeTranscript(transcript, durationSeconds)

    const result = await query<{ id: string }>(
      `INSERT INTO voice_sessions (
        user_id, prompt_type, duration_seconds, word_count, unique_word_count,
        unique_word_ratio, speech_rate_wpm, grammar_complexity, coherence_score,
        fluency_score, transcript_hash, nlp_features
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        userId, promptType.data, durationSeconds,
        metrics.wordCount, metrics.uniqueWordCount, metrics.uniqueWordRatio,
        metrics.speechRateWpm, metrics.grammarComplexity, metrics.coherenceScore,
        metrics.fluencyScore, metrics.transcriptHash,
        JSON.stringify(metrics.nlpFeatures),
      ]
    )

    const today = new Date().toISOString().slice(0, 10)
    await upsertFluencyHistory(
      (sql, params) => query(sql, params as unknown[]),
      userId,
      today,
      metrics.fluencyScore
    )

    return {
      sessionId: result.rows[0].id,
      transcript: transcript || null,
      ...metrics,
    }
  })

  // GET /voice/history?limit=20
  fastify.get('/history', async (request) => {
    const userId = (request.user as { sub: string }).sub
    const { limit = '20' } = request.query as { limit?: string }

    const sessions = await query<{
      id: string; prompt_type: string; duration_seconds: number
      word_count: number; fluency_score: string; recorded_at: string
    }>(
      `SELECT id, prompt_type, duration_seconds, word_count, fluency_score, recorded_at
         FROM voice_sessions WHERE user_id = $1
         ORDER BY recorded_at DESC LIMIT $2`,
      [userId, parseInt(limit, 10)]
    )

    const trend = await query<{ date: string; score: string; trend_7d: string | null }>(
      `SELECT date, score, trend_7d FROM fluency_score_history
        WHERE user_id = $1 ORDER BY date DESC LIMIT 30`,
      [userId]
    )

    return {
      sessions: sessions.rows.map(r => ({
        id: r.id,
        promptType: r.prompt_type,
        durationSeconds: r.duration_seconds,
        wordCount: r.word_count,
        fluencyScore: parseFloat(r.fluency_score),
        recordedAt: r.recorded_at,
      })),
      trend: trend.rows.map(r => ({
        date: r.date,
        score: parseFloat(r.score),
        trend7d: r.trend_7d ? parseFloat(r.trend_7d) : null,
      })),
    }
  })
}
