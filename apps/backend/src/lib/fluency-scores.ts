import crypto from 'crypto'

export interface TranscriptMetrics {
  wordCount: number
  uniqueWordCount: number
  uniqueWordRatio: number
  speechRateWpm: number
  grammarComplexity: number  // 0-100
  coherenceScore: number     // 0-100
  fluencyScore: number       // 0-100
  transcriptHash: string
  nlpFeatures: Record<string, number>
}

const STOPWORDS = new Set([
  'bir', 've', 'de', 'da', 'bu', 'o', 'şu', 'ile', 'için', 'ama', 'ya',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'is', 'was', 'are', 'be', 'been', 'i', 'it', 'that',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zçğıöşüA-ZÇĞİÖŞÜ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)
}

function contentWords(tokens: string[]): string[] {
  return tokens.filter(w => !STOPWORDS.has(w))
}

function sentenceSplit(text: string): string[] {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0)
}

// Grammar complexity: based on avg sentence length + lexical density
function computeGrammarComplexity(tokens: string[], sentences: string[]): number {
  if (sentences.length === 0 || tokens.length === 0) return 0

  const avgSentenceLen = tokens.length / sentences.length
  // Ideal: 10-20 words/sentence → score 70-100, <5 or >30 → lower
  const sentLenScore = Math.max(0, 100 - Math.abs(avgSentenceLen - 15) * 4)

  // Lexical density: content words / total words
  const contentRatio = contentWords(tokens).length / tokens.length
  const densityScore = Math.min(100, contentRatio * 130)

  return Math.round((sentLenScore * 0.5 + densityScore * 0.5))
}

// Coherence: based on type-token ratio of content words (higher = more varied vocabulary used consistently)
function computeCoherence(tokens: string[]): number {
  if (tokens.length < 5) return 50
  const content = contentWords(tokens)
  if (content.length === 0) return 30

  const unique = new Set(content).size
  // TTR with correction for text length (Guiraud index)
  const guiraud = unique / Math.sqrt(content.length)
  // Typical range 4-10 → map to 40-90
  const score = Math.min(100, Math.max(0, (guiraud - 2) * 12))
  return Math.round(score)
}

// Ideal speech rate: 120-160 WPM in native language
function speechRateScore(wpm: number): number {
  if (wpm <= 0) return 0
  if (wpm >= 80 && wpm <= 180) {
    const distFromIdeal = Math.abs(wpm - 130)
    return Math.round(Math.max(40, 100 - distFromIdeal * 1.2))
  }
  return wpm < 80 ? Math.round(wpm / 80 * 40) : Math.round(Math.max(20, 100 - (wpm - 180) * 1.5))
}

export function analyzeTranscript(
  transcript: string,
  durationSeconds: number
): TranscriptMetrics {
  const tokens = tokenize(transcript)
  const sentences = sentenceSplit(transcript)
  const uniqueTokens = new Set(tokens)

  const wordCount = tokens.length
  const uniqueWordCount = uniqueTokens.size
  const uniqueWordRatio = wordCount > 0 ? uniqueWordCount / wordCount : 0
  const speechRateWpm = durationSeconds > 0
    ? parseFloat(((wordCount / durationSeconds) * 60).toFixed(1))
    : 0

  const grammarComplexity = computeGrammarComplexity(tokens, sentences)
  const coherenceScore = computeCoherence(tokens)
  const wpmScore = speechRateScore(speechRateWpm)

  // Weighted composite fluency score
  // Vocabulary richness: 30%, Speech rate: 25%, Grammar: 25%, Coherence: 20%
  const fluencyScore = Math.round(
    (uniqueWordRatio * 100 * 0.30) +
    (wpmScore * 0.25) +
    (grammarComplexity * 0.25) +
    (coherenceScore * 0.20)
  )

  const transcriptHash = crypto
    .createHash('sha256')
    .update(transcript)
    .digest('hex')

  return {
    wordCount,
    uniqueWordCount,
    uniqueWordRatio: parseFloat(uniqueWordRatio.toFixed(3)),
    speechRateWpm,
    grammarComplexity,
    coherenceScore,
    fluencyScore: Math.min(100, fluencyScore),
    transcriptHash,
    nlpFeatures: {
      sentenceCount: sentences.length,
      avgSentenceLength: sentences.length > 0 ? parseFloat((tokens.length / sentences.length).toFixed(1)) : 0,
      contentWordRatio: parseFloat((contentWords(tokens).length / Math.max(1, tokens.length)).toFixed(3)),
      wpmScore,
    },
  }
}

export async function upsertFluencyHistory(
  queryFn: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }>,
  userId: string,
  date: string,
  newScore: number
): Promise<void> {
  const hist = await queryFn(
    `SELECT score FROM fluency_score_history WHERE user_id = $1 AND date = $2`,
    [userId, date]
  )

  // 7-day rolling average
  const recent = await queryFn(
    `SELECT AVG(score) AS avg7 FROM fluency_score_history
      WHERE user_id = $1 AND date >= $2::date - INTERVAL '7 days' AND date < $2::date`,
    [userId, date]
  )
  const avg7 = (recent.rows[0] as { avg7: string | null })?.avg7
  const trend7d = avg7 ? parseFloat(avg7) - newScore : null

  const exists = hist.rows.length > 0
  if (exists) {
    await queryFn(
      `UPDATE fluency_score_history SET score = $3, trend_7d = $4 WHERE user_id = $1 AND date = $2`,
      [userId, date, newScore, trend7d]
    )
  } else {
    await queryFn(
      `INSERT INTO fluency_score_history (user_id, date, score, trend_7d) VALUES ($1, $2, $3, $4)`,
      [userId, date, newScore, trend7d]
    )
  }
}
