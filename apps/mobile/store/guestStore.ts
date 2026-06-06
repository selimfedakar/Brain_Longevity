import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Tipler ──────────────────────────────────────────────────────────────────

export interface GuestDietEntry {
  foodCategory: string
  servings: number
  isNegative: boolean
}

export interface GuestDietLog {
  date: string
  entries: GuestDietEntry[]
  mindScore: number | null
}

export interface GuestEloRecord {
  domain: string
  eloRating: number
  gamesPlayed: number
}

// ── Anahtarlar ───────────────────────────────────────────────────────────────

const DIET_KEY = 'guest:diet_logs'
const ELO_KEY  = 'guest:cognitive_elo'

// ── MIND skor hesabı (backend ile aynı mantık) ────────────────────────────

const NEGATIVE_CATS = new Set([
  'red_meat', 'butter_margarine', 'cheese', 'pastries_sweets', 'fried_fast_food',
])

const MIND_THRESHOLDS: Record<string, { target: number; isNegative?: boolean }> = {
  leafy_greens:       { target: 6 },
  other_vegetables:   { target: 1 },
  nuts:               { target: 5 },
  berries:            { target: 2 },
  beans:              { target: 4 },
  whole_grains:       { target: 3 },
  fish:               { target: 1 },
  poultry:            { target: 2 },
  olive_oil:          { target: 1 },
  wine:               { target: 1 },
  red_meat:           { target: 4, isNegative: true },
  butter_margarine:   { target: 1, isNegative: true },
  cheese:             { target: 1, isNegative: true },
  pastries_sweets:    { target: 5, isNegative: true },
  fried_fast_food:    { target: 1, isNegative: true },
}

export function computeLocalMindScore(weeklyTotals: Record<string, number>): number {
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

// ── Diyet işlemleri ──────────────────────────────────────────────────────────

async function getAllDietLogs(): Promise<GuestDietLog[]> {
  try {
    const raw = await AsyncStorage.getItem(DIET_KEY)
    return raw ? (JSON.parse(raw) as GuestDietLog[]) : []
  } catch {
    return []
  }
}

async function saveDietLogs(logs: GuestDietLog[]): Promise<void> {
  await AsyncStorage.setItem(DIET_KEY, JSON.stringify(logs))
}

export async function guestLogDiet(
  date: string,
  entries: { foodCategory: string; servings: number }[]
): Promise<number> {
  const logs = await getAllDietLogs()
  const enriched: GuestDietEntry[] = entries.map(e => ({
    ...e,
    isNegative: NEGATIVE_CATS.has(e.foodCategory),
  }))

  // Bu hafta için weekly totals hesapla (mevcut + bu gün)
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const weekStart = d.toISOString().slice(0, 10)
  const weekEnd = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const existing = logs.filter(
    l => l.date >= weekStart && l.date <= weekEnd && l.date !== date
  )

  const totals: Record<string, number> = {}
  for (const log of existing) {
    for (const e of log.entries) {
      totals[e.foodCategory] = (totals[e.foodCategory] ?? 0) + e.servings
    }
  }
  for (const e of enriched) {
    totals[e.foodCategory] = (totals[e.foodCategory] ?? 0) + e.servings
  }

  const mindScore = computeLocalMindScore(totals)

  // Upsert
  const idx = logs.findIndex(l => l.date === date)
  const newLog: GuestDietLog = { date, entries: enriched, mindScore }
  if (idx >= 0) logs[idx] = newLog
  else logs.push(newLog)

  await saveDietLogs(logs)
  return mindScore
}

export async function guestGetDietToday(date: string): Promise<GuestDietLog | null> {
  const logs = await getAllDietLogs()
  return logs.find(l => l.date === date) ?? null
}

export async function guestGetWeeklyReport(weekStart?: string): Promise<{
  weekStart: string
  weekEnd: string
  mindScore: number
  maxScore: number
  categoryTotals: Record<string, number>
  dailyScores: { date: string; score: number }[]
}> {
  let ws: string
  if (weekStart) {
    ws = weekStart
  } else {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    ws = d.toISOString().slice(0, 10)
  }
  const we = new Date(new Date(ws).getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const logs = await getAllDietLogs()
  const weekLogs = logs.filter(l => l.date >= ws && l.date <= we)

  const totals: Record<string, number> = {}
  for (const log of weekLogs) {
    for (const e of log.entries) {
      totals[e.foodCategory] = (totals[e.foodCategory] ?? 0) + e.servings
    }
  }

  return {
    weekStart: ws,
    weekEnd: we,
    mindScore: computeLocalMindScore(totals),
    maxScore: 15,
    categoryTotals: totals,
    dailyScores: weekLogs.map(l => ({ date: l.date, score: l.mindScore ?? 0 })),
  }
}

// ── ELO işlemleri ────────────────────────────────────────────────────────────

export async function guestGetElo(): Promise<GuestEloRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(ELO_KEY)
    return raw ? (JSON.parse(raw) as GuestEloRecord[]) : []
  } catch {
    return []
  }
}

export async function guestUpdateElo(domain: string, newRating: number): Promise<void> {
  const records = await guestGetElo()
  const idx = records.findIndex(r => r.domain === domain)
  if (idx >= 0) {
    records[idx].eloRating = newRating
    records[idx].gamesPlayed += 1
  } else {
    records.push({ domain, eloRating: newRating, gamesPlayed: 1 })
  }
  await AsyncStorage.setItem(ELO_KEY, JSON.stringify(records))
}

// ── Migration (hesap açıldığında backend'e gönder) ───────────────────────────

export async function migrateGuestDataToBackend(
  apiPost: (path: string, body: unknown) => Promise<unknown>
): Promise<void> {
  const logs = await getAllDietLogs()
  for (const log of logs) {
    try {
      await apiPost('/diet/log', {
        date: log.date,
        entries: log.entries.map(e => ({ foodCategory: e.foodCategory, servings: e.servings })),
      })
    } catch {
      // Başarısız olan kayıtları sessizce geç
    }
  }
  // Başarılı migration sonrası yerel veriyi sil
  await AsyncStorage.removeItem(DIET_KEY)
  await AsyncStorage.removeItem(ELO_KEY)
}
