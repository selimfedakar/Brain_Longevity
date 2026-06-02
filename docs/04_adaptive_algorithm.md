# Adaptif Kognitif Algoritma — Pseudocode & Tasarım

## Genel Yaklaşım: ELO-based Closed-Loop

Kullanıcının her domain'inde bir ELO rating'i var (başlangıç: 1000).
Her oyun session'ının bir zorluk rating'i var.
Performans (doğruluk + hız) → ELO güncellemesi → bir sonraki oyunun zorluğu belirlenir.

Bu klasik Item Response Theory (IRT) mantığının oyunlaştırılmış versiyonu.

---

## Sabitler

```
K_FACTOR = 32              // ELO hassasiyeti (yeni kullanıcılar için 40, sonra 24)
ACCURACY_CEILING = 92      // Bu üstü → zorluk artır
ACCURACY_FLOOR   = 55      // Bu altı → zorluk azalt
STRETCH_FACTOR   = 75      // Hedef zorluk = userELO + 75 (hafif zorluşturma)

// Domain bazlı hedef tepki süresi (ms) — literatür ortalamaları
TARGET_RESPONSE_TIMES = {
  attention:         600,
  working_memory:    1200,
  processing_speed:  400,
  multitasking:      1500,
  spatial:           2000,
  executive_function: 1800
}
```

---

## Çekirdek Fonksiyonlar

```javascript
// 1. Performans skoru — accuracy 70% + hız 30%
function calculatePerformanceScore(accuracy, responseMs, domain) {
  const targetMs = TARGET_RESPONSE_TIMES[domain]
  const speedRatio = targetMs / responseMs
  const speedScore = clamp(speedRatio * 100, 0, 100)
  return (accuracy * 0.70) + (speedScore * 0.30)
}

// 2. ELO güncelleme
function updateELO(userELO, gameELO, performanceScore) {
  // Beklenen performans (ELO farkına göre)
  const expected = 1 / (1 + Math.pow(10, (gameELO - userELO) / 400))
  const actual   = performanceScore / 100
  const delta    = Math.round(K_FACTOR * (actual - expected))
  return {
    newELO: userELO + delta,
    delta
  }
}

// 3. Bir sonraki oyunu seç
function selectNextGame(userELO, domain, recentGameTypes) {
  const targetDifficulty = userELO + STRETCH_FACTOR + randomBetween(-30, 30)

  // Son 3 oyunda aynı tip tekrar etmesin
  const available = GAMES_BY_DOMAIN[domain]
    .filter(game => !recentGameTypes.slice(-3).includes(game.type))

  // Hedef zorluğa en yakın oyunu seç
  return available.reduce((best, game) =>
    Math.abs(game.difficultyRating - targetDifficulty) <
    Math.abs(best.difficultyRating - targetDifficulty) ? game : best
  )
}
```

---

## Oyun Kataloğu (Domain → Game Mapping)

```
GAMES_BY_DOMAIN = {
  working_memory: [
    { type: 'n_back_1', difficultyRating: 800  },
    { type: 'n_back_2', difficultyRating: 1000 },
    { type: 'n_back_3', difficultyRating: 1200 },
    { type: 'n_back_4', difficultyRating: 1400 },
    { type: 'digit_span_forward',  difficultyRating: 850  },
    { type: 'digit_span_backward', difficultyRating: 1100 },
  ],
  attention: [
    { type: 'stroop_classic',     difficultyRating: 900  },
    { type: 'stroop_complex',     difficultyRating: 1150 },
    { type: 'flanker_congruent',  difficultyRating: 800  },
    { type: 'flanker_incongruent',difficultyRating: 1050 },
    { type: 'sustained_vigilance',difficultyRating: 1000 },
  ],
  processing_speed: [
    { type: 'symbol_match',    difficultyRating: 850  },
    { type: 'trail_making_a',  difficultyRating: 900  },
    { type: 'trail_making_b',  difficultyRating: 1200 },
    { type: 'digit_symbol',    difficultyRating: 1000 },
  ],
  multitasking: [
    { type: 'dual_task_easy',   difficultyRating: 1000 },
    { type: 'dual_task_medium', difficultyRating: 1200 },
    { type: 'dual_task_hard',   difficultyRating: 1500 },
  ],
  spatial: [
    { type: 'mental_rotation_2d', difficultyRating: 900  },
    { type: 'mental_rotation_3d', difficultyRating: 1200 },
    { type: 'spatial_span',       difficultyRating: 1050 },
    { type: 'wayfinding',         difficultyRating: 1300 },
  ]
}
```

---

## Zihinsel Akıcılık Skoru (Fluency Score)

### Feature Extraction Pipeline

```
Ses Dosyası
    │
    ▼
[Whisper API] → transkript (text + timestamps)
    │
    ▼
[Feature Extraction — server-side]
    ├── word_count, unique_word_count
    ├── unique_word_ratio = unique / total     (vocabulary richness)
    ├── speech_rate_wpm = word_count / (duration / 60)
    ├── pause_events = boşluk > 500ms olan segment'ler
    ├── avg_pause_ms = ortalama durakasama süresi
    └── pause_frequency = pause_events / duration_sec
    │
    ▼
[Claude API — coherence analizi]
    prompt: "Analyze this transcript for logical coherence,
             topic maintenance, and narrative structure.
             Return a JSON: {coherence: 0-100, topic_drift: boolean,
             sentence_complexity_avg: 0-100}"
    │
    ▼
[Composite Score Hesabı]
```

### Composite Score Formülü

```javascript
function calculateFluencyScore(features, llmResult) {
  // Her feature'ı 0-100 normalize et
  const vocabScore    = normalize(features.uniqueWordRatio,    { optimal: 0.55, min: 0.25, max: 0.75 })
  const pauseScore    = normalizePause(features.avgPauseMs)   // optimal: 300-500ms
  const rateScore     = normalizeRate(features.speechRateWpm) // optimal: 120-150 wpm
  const grammarScore  = features.grammarComplexity             // NLP'den 0-100
  const coherenceScore = llmResult.coherence                  // Claude'dan 0-100

  const weights = {
    vocab:     0.30,
    pause:     0.25,
    rate:      0.20,
    grammar:   0.15,
    coherence: 0.10
  }

  return (
    vocabScore    * weights.vocab    +
    pauseScore    * weights.pause    +
    rateScore     * weights.rate     +
    grammarScore  * weights.grammar  +
    coherenceScore * weights.coherence
  )
}

function normalizePause(avgPauseMs) {
  // 300-500ms optimal, <200ms çok hızlı, >800ms yavaş
  if (avgPauseMs >= 300 && avgPauseMs <= 500) return 100
  if (avgPauseMs < 300) return clamp((avgPauseMs / 300) * 100, 0, 100)
  return clamp(100 - ((avgPauseMs - 500) / 5), 0, 100)
}

function normalizeRate(wpm) {
  // 120-150 wpm optimal
  if (wpm >= 120 && wpm <= 150) return 100
  if (wpm < 120) return clamp((wpm / 120) * 100, 0, 100)
  return clamp(100 - ((wpm - 150) / 2), 0, 100)
}
```

---

## Brain Health Index (BHI) — Günlük Kompozit Endeks

```javascript
async function computeBrainHealthIndex(userId, date) {
  const [cognitive, sleep, exercise, diet, fluency] = await Promise.all([
    getDailyCognitiveScore(userId, date),  // 0-100
    computeSleepScore(userId, date),        // 0-100
    computeExerciseScore(userId, date),     // 0-100
    getMINDDietScore(userId, date),         // normalize(0-15) → 0-100
    getLatestFluencyScore(userId)           // 0-100
  ])

  const weights = { cognitive: 0.30, sleep: 0.25, exercise: 0.20, diet: 0.15, fluency: 0.10 }

  const composite = (
    cognitive * weights.cognitive +
    sleep     * weights.sleep     +
    exercise  * weights.exercise  +
    diet      * weights.diet      +
    fluency   * weights.fluency
  )

  await db.upsert('brain_health_index', { userId, date, cognitive, sleep, exercise, diet, fluency, composite })
  return composite
}

function computeSleepScore(userId, date) {
  // Deep sleep >= 90dk → bonus, REM >= 90dk → bonus, total 7-9 saat → optimal
  const { deepSleep, remSleep, totalSleep, efficiency } = getSleepMetrics(userId, date)
  const deepScore    = clamp((deepSleep / 90) * 100, 0, 100)
  const remScore     = clamp((remSleep / 90) * 100, 0, 100)
  const durationScore = totalSleep >= 420 && totalSleep <= 540 ? 100
                       : totalSleep < 420 ? (totalSleep / 420) * 100
                       : 100 - ((totalSleep - 540) / 3)
  return (deepScore * 0.35 + remScore * 0.30 + durationScore * 0.35)
}

function computeExerciseScore(userId, date) {
  // WHO önerisi: haftada 150dk moderate VEYA 75dk vigorous
  // Günlük hedef: 22dk moderate veya 11dk vigorous
  const { moderateMin, vigorousMin } = getActivityMetrics(userId, date)
  const equivalentMin = moderateMin + (vigorousMin * 2)
  return clamp((equivalentMin / 22) * 100, 0, 100)
}
```

---

## Caregiver Alert Worker (Daily Cron)

```javascript
async function runCaregiverAlertWorker() {
  const patients = await getPatientsWithCaregivers()

  for (const patient of patients) {
    const alerts = []

    // 1. Ardışık kaçırılan session kontrolü
    const missedDays = await countConsecutiveMissedDays(patient.id)
    if (missedDays >= 3) {
      alerts.push({ type: 'missed_cognitive_session', severity: 'medium',
                    payload: { missedDays } })
    }

    // 2. Uyku skoru
    const sleepScore = await getSleepScore(patient.id, yesterday())
    if (sleepScore < 40) {
      alerts.push({ type: 'poor_sleep', severity: 'low',
                    payload: { sleepScore } })
    }

    // 3. 7 günlük fluency trendi
    const fluencyTrend = await getFluencyTrend(patient.id, 7)
    if (fluencyTrend < -10) {
      alerts.push({ type: 'fluency_decline_trend', severity: 'high',
                    payload: { trend: fluencyTrend } })
    }

    // 4. Alert'leri gönder (aynı gün aynı tip tekrar gönderme)
    for (const alert of alerts) {
      const alreadySent = await wasAlertSentToday(patient.id, alert.type)
      if (!alreadySent) {
        await sendCaregiverAlert(patient.id, alert)
        await sendPushNotification(patient.caregiverFCMToken, alert)
      }
    }
  }
}
```
