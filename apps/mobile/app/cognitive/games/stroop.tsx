import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, runOnJS, FadeIn, FadeOut,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'
import { GameHeader } from '../../../components/GameHeader'

const COLORS = [
  { name: 'Kırmızı', hex: '#EF4444' },
  { name: 'Mavi',    hex: '#3B82F6' },
  { name: 'Yeşil',   hex: '#10B981' },
  { name: 'Sarı',    hex: '#F59E0B' },
]

const TOTAL_TRIALS = 15
const TIMEOUT_MS = 3000

interface Trial {
  word: string
  wordColor: string
  correctAnswer: string
}

function generateTrials(): Trial[] {
  return Array.from({ length: TOTAL_TRIALS }, (_, i) => {
    const wordColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    let displayColor = wordColor
    if (i === 0 || Math.random() < 0.65) {
      const others = COLORS.filter((c) => c.name !== wordColor.name)
      displayColor = others[Math.floor(Math.random() * others.length)]
    }
    return { word: wordColor.name, wordColor: displayColor.hex, correctAnswer: displayColor.name }
  })
}

type Screen = 'ready' | 'playing' | 'done'

export default function StroopGame() {
  const params = useLocalSearchParams<{ gameType: string; domain: string; difficulty: string; userELO: string }>()
  const [screen, setScreen] = useState<Screen>('ready')
  const [trials] = useState<Trial[]>(generateTrials)
  const [current, setCurrent] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS)
  const trialStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { post } = useApi()

  // Animations
  const wordScale = useSharedValue(0.6)
  const wordOpacity = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const bgColor = useSharedValue('transparent')
  const shakeX = useSharedValue(0)

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordScale.value }, { translateX: shakeX.value }],
    opacity: wordOpacity.value,
  }))

  const bgStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    backgroundColor: bgColor.value,
    opacity: bgOpacity.value,
  }))

  function animateStimulus() {
    wordScale.value = 0.6
    wordOpacity.value = 0
    wordScale.value = withSpring(1, { damping: 10, stiffness: 200 })
    wordOpacity.value = withTiming(1, { duration: 150 })
  }

  function flashFeedback(isCorrect: boolean) {
    bgColor.value = isCorrect ? '#10B981' : '#EF4444'
    bgOpacity.value = withSequence(
      withTiming(0.18, { duration: 60 }),
      withTiming(0, { duration: 300 })
    )
    if (!isCorrect) {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      )
    }
  }

  const advanceTrial = useCallback(
    (newCorrect: number, newTimes: number[]) => {
      if (current + 1 >= TOTAL_TRIALS) {
        finishGame(newCorrect, newTimes)
      } else {
        setCurrent((c) => {
          const next = c + 1
          setTimeout(animateStimulus, 50)
          return next
        })
      }
    },
    [current]
  )

  useEffect(() => {
    if (screen !== 'playing') return
    animateStimulus()
    setTimeLeft(TIMEOUT_MS)
    trialStartRef.current = performance.now()

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 50
        if (next <= 0) {
          clearInterval(timerRef.current!)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          const updated = [...responseTimes, TIMEOUT_MS]
          setResponseTimes(updated)
          runOnJS(advanceTrial)(correct, updated)
          return TIMEOUT_MS
        }
        return next
      })
    }, 50)

    return () => clearInterval(timerRef.current!)
  }, [current, screen])

  async function finishGame(finalCorrect: number, finalTimes: number[]) {
    clearInterval(timerRef.current!)
    const avgMs = finalTimes.length
      ? Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length)
      : TIMEOUT_MS
    try {
      const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
        gameType: params.gameType ?? 'stroop_classic',
        domain: params.domain ?? 'attention',
        totalTrials: TOTAL_TRIALS,
        correctTrials: finalCorrect,
        avgResponseMs: avgMs,
        difficultyRating: parseInt(params.difficulty ?? '1000', 10),
      })
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'stroop_classic', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: result.eloDelta, eloAfter: result.eloAfter } })
    } catch {
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'stroop_classic', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: 0, eloAfter: parseInt(params.userELO ?? '1000', 10) } })
    }
  }

  function handleAnswer(colorName: string) {
    if (screen !== 'playing') return
    clearInterval(timerRef.current!)
    const rt = Math.round(performance.now() - trialStartRef.current)
    const isCorrect = colorName === trials[current].correctAnswer
    const newCorrect = correct + (isCorrect ? 1 : 0)
    const newTimes = [...responseTimes, rt]

    flashFeedback(isCorrect)
    if (isCorrect) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setCorrect(newCorrect)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
    setResponseTimes(newTimes)

    setTimeout(() => advanceTrial(newCorrect, newTimes), 320)
  }

  if (screen === 'ready') {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>
          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🎨</Text>
            <Text style={styles.readyTitle}>Stroop Testi</Text>
            <Text style={styles.readyDesc}>
              Kelimenin <Text style={styles.bold}>rengine</Text> göre cevap ver{'\n'}
              — kelimeyi değil, rengi oku.
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Örnek</Text>
            <Text style={[styles.exampleWord, { color: '#3B82F6' }]}>KIRMIZI</Text>
            <View style={styles.exampleAnswer}>
              <View style={[styles.exampleDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.exampleAnswerText}>Doğru cevap: Mavi</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>15 deneme</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>3s limit</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>Dikkat testi</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScreen('playing') }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'stroop_classic'} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const trial = trials[current]

  return (
    <SafeAreaView style={styles.gameContainer}>
      <Animated.View style={bgStyle} pointerEvents="none" />

      <GameHeader
        current={current + 1}
        total={TOTAL_TRIALS}
        correct={correct}
        timeLeft={timeLeft}
        timeTotal={TIMEOUT_MS}
        gameLabel="STROOP"
      />

      <View style={styles.stimulusArea}>
        <Animated.Text style={[styles.colorWord, { color: trial.wordColor }, wordStyle]}>
          {trial.word.toUpperCase()}
        </Animated.Text>
        <Text style={styles.instruction}>rengini seç</Text>
      </View>

      <View style={styles.colorGrid}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c.name}
            style={[styles.colorButton, { backgroundColor: c.hex }]}
            onPress={() => handleAnswer(c.name)}
            activeOpacity={0.75}
          >
            <View style={[styles.colorDot]} />
            <Text style={styles.colorLabel}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Ready screen
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  readyContainer: { flex: 1, backgroundColor: '#fff' },
  readyScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 20 },
  readyHero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  readyEmoji: { fontSize: 64 },
  readyTitle: { fontSize: 30, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.5 },
  readyDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 25 },
  bold: { fontWeight: '800', color: '#1A1A2E' },
  exampleCard: {
    backgroundColor: '#F7F9FC', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E8ECF0',
  },
  exampleLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  exampleWord: { fontSize: 42, fontWeight: '900', letterSpacing: 3 },
  exampleAnswer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exampleDot: { width: 14, height: 14, borderRadius: 7 },
  exampleAnswerText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: {
    backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  // Game screen
  gameContainer: { flex: 1, backgroundColor: '#0F0F1E' },
  stimulusArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  colorWord: { fontSize: 68, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  instruction: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  colorButton: {
    flex: 1, minWidth: '47%', paddingVertical: 22, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  colorDot: {},
  colorLabel: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
})
