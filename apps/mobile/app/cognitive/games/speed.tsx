import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, runOnJS, FadeInDown,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'
import { GameHeader } from '../../../components/GameHeader'

const SYMBOLS = ['★', '◆', '▲', '●', '✦', '♦', '⬟', '⬡', '⬢', '✿', '❋', '⚛']

const TOTAL_TRIALS = 12
const TIMEOUT_MS = 2500

interface Trial {
  target: string
  options: string[]
  correctIndex: number
}

function generateTrials(): Trial[] {
  return Array.from({ length: TOTAL_TRIALS }, () => {
    const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5)
    const target = shuffled[0]
    const distractors = shuffled.slice(1, 4)
    const correctIndex = Math.floor(Math.random() * 4)
    const options = [...distractors]
    options.splice(correctIndex, 0, target)
    return { target, options, correctIndex }
  })
}

type Screen = 'ready' | 'playing' | 'done'

export default function SpeedGame() {
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

  const symbolScale = useSharedValue(0.5)
  const symbolOpacity = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const bgColor = useSharedValue('transparent')
  const shakeX = useSharedValue(0)

  const symbolStyle = useAnimatedStyle(() => ({
    transform: [{ scale: symbolScale.value }, { translateX: shakeX.value }],
    opacity: symbolOpacity.value,
  }))

  const bgStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    backgroundColor: bgColor.value,
    opacity: bgOpacity.value,
  }))

  function animateStimulus() {
    symbolScale.value = 0.5
    symbolOpacity.value = 0
    symbolScale.value = withSpring(1, { damping: 10, stiffness: 200 })
    symbolOpacity.value = withTiming(1, { duration: 150 })
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
        gameType: params.gameType ?? 'symbol_match',
        domain: params.domain ?? 'processing_speed',
        totalTrials: TOTAL_TRIALS,
        correctTrials: finalCorrect,
        avgResponseMs: avgMs,
        difficultyRating: parseInt(params.difficulty ?? '850', 10),
      })
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'symbol_match', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: result.eloDelta, eloAfter: result.eloAfter } })
    } catch {
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'symbol_match', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: 0, eloAfter: parseInt(params.userELO ?? '1000', 10) } })
    }
  }

  function handleAnswer(index: number) {
    if (screen !== 'playing') return
    clearInterval(timerRef.current!)
    const rt = Math.round(performance.now() - trialStartRef.current)
    const isCorrect = index === trials[current].correctIndex
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
    const isDigitSymbol = (params.gameType ?? 'symbol_match') === 'digit_symbol'
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>
          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>⚡</Text>
            <Text style={styles.readyTitle}>{isDigitSymbol ? 'Rakam-Sembol Testi' : 'Sembol Eşleştirme'}</Text>
            <Text style={styles.readyDesc}>
              Üstteki <Text style={styles.bold}>hedef sembolü</Text> bul{'\n'}
              — alttaki dört seçenekten eşini seç.
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Örnek</Text>
            <Text style={styles.exampleSymbol}>★</Text>
            <View style={styles.exampleRow}>
              {['◆', '★', '▲', '●'].map((s, i) => (
                <View key={i} style={[styles.exampleOption, i === 1 && styles.exampleOptionCorrect]}>
                  <Text style={[styles.exampleOptionText, i === 1 && styles.exampleOptionTextCorrect]}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.exampleAnswerText}>İkinci seçenek doğru!</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>12 deneme</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>2.5s limit</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>İşlem hızı</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScreen('playing') }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'symbol_match'} />
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
        gameLabel="SEMBOL"
      />

      <View style={styles.stimulusArea}>
        <Text style={styles.instruction}>hedefi bul</Text>
        <Animated.Text style={[styles.targetSymbol, symbolStyle]}>
          {trial.target}
        </Animated.Text>
      </View>

      <View style={styles.optionGrid}>
        {trial.options.map((symbol, i) => (
          <Animated.View
            key={`${current}-${i}`}
            entering={FadeInDown.delay(i * 80).springify()}
            style={styles.optionWrapper}
          >
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleAnswer(i)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionSymbol}>{symbol}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
  exampleSymbol: { fontSize: 48, color: '#1A1A2E' },
  exampleRow: { flexDirection: 'row', gap: 8 },
  exampleOption: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  exampleOptionCorrect: { backgroundColor: '#D1FAE5', borderWidth: 2, borderColor: '#10B981' },
  exampleOptionText: { fontSize: 26, color: '#374151' },
  exampleOptionTextCorrect: { color: '#065F46' },
  exampleAnswerText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: {
    backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  gameContainer: { flex: 1, backgroundColor: '#0F0F1E' },
  stimulusArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  instruction: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 },
  targetSymbol: { fontSize: 80, color: '#fff' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  optionWrapper: { flex: 1, minWidth: '47%' },
  optionButton: {
    backgroundColor: '#1E1E2E', paddingVertical: 28, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  optionSymbol: { fontSize: 44, color: '#fff' },
})
