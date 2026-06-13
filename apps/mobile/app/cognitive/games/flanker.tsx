import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, FadeInDown,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'

const TOTAL_TRIALS = 20
const TIMEOUT_MS = 2500

type Direction = 'left' | 'right'

interface Trial {
  center: Direction
  congruent: boolean
  flankers: string
  center_arrow: string
}

function generateTrials(): Trial[] {
  const base: Trial[] = []
  for (let i = 0; i < TOTAL_TRIALS; i++) {
    const center: Direction = Math.random() < 0.5 ? 'left' : 'right'
    const congruent = Math.random() < 0.5
    const flankerDir = congruent ? center : center === 'left' ? 'right' : 'left'
    base.push({
      center,
      congruent,
      flankers: flankerDir === 'left' ? '←' : '→',
      center_arrow: center === 'left' ? '←' : '→',
    })
  }
  return base.sort(() => Math.random() - 0.5)
}

type Phase = 'ready' | 'fixation' | 'stimulus' | 'isi'

export default function FlankerGame() {
  const params = useLocalSearchParams<{ gameType: string; domain: string; difficulty: string; userELO: string }>()
  const [phase, setPhase] = useState<Phase>('ready')
  const [trials] = useState<Trial[]>(generateTrials)
  const [current, setCurrent] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS)
  const trialStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const respondedRef = useRef(false)
  const { post } = useApi()

  const flankerOpacity = useSharedValue(0)
  const centerScale = useSharedValue(0.3)
  const bgOpacity = useSharedValue(0)
  const bgColor = useSharedValue('#10B981')
  const leftBtnScale = useSharedValue(1)
  const rightBtnScale = useSharedValue(1)

  const arrowsStyle = useAnimatedStyle(() => ({ opacity: flankerOpacity.value }))
  const centerStyle = useAnimatedStyle(() => ({ transform: [{ scale: centerScale.value }] }))
  const bgStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    backgroundColor: bgColor.value,
    opacity: bgOpacity.value,
    pointerEvents: 'none',
  }))
  const leftBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: leftBtnScale.value }] }))
  const rightBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: rightBtnScale.value }] }))

  function animateStimulusIn() {
    flankerOpacity.value = 0
    centerScale.value = 0.3
    flankerOpacity.value = withTiming(1, { duration: 100 })
    centerScale.value = withSpring(1, { damping: 10, stiffness: 300 })
  }

  function flashResult(ok: boolean) {
    bgColor.value = ok ? '#10B981' : '#EF4444'
    bgOpacity.value = withSequence(withTiming(0.15, { duration: 60 }), withTiming(0, { duration: 280 }))
  }

  const advance = useCallback(
    (newCorrect: number, newTimes: number[]) => {
      if (current + 1 >= TOTAL_TRIALS) {
        finishGame(newCorrect, newTimes)
      } else {
        setCurrent((c) => c + 1)
        setFeedback(null)
        respondedRef.current = false
        setPhase('fixation')
      }
    },
    [current]
  )

  useEffect(() => {
    if (phase === 'fixation') {
      flankerOpacity.value = withTiming(0, { duration: 100 })
      const t = setTimeout(() => {
        setPhase('stimulus')
        trialStartRef.current = performance.now()
        setTimeLeft(TIMEOUT_MS)
        animateStimulusIn()
      }, 500)
      return () => clearTimeout(t)
    }

    if (phase === 'stimulus') {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          const next = t - 50
          if (next <= 0) {
            clearInterval(timerRef.current!)
            if (!respondedRef.current) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
              const newTimes = [...responseTimes, TIMEOUT_MS]
              setResponseTimes(newTimes)
              advance(correct, newTimes)
            }
            return TIMEOUT_MS
          }
          return next
        })
      }, 50)
      return () => clearInterval(timerRef.current!)
    }
  }, [phase, current])

  async function finishGame(finalCorrect: number, finalTimes: number[]) {
    const avgMs = finalTimes.length
      ? Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length)
      : TIMEOUT_MS
    try {
      const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
        gameType: params.gameType ?? 'flanker_incongruent',
        domain: params.domain ?? 'attention',
        totalTrials: TOTAL_TRIALS,
        correctTrials: finalCorrect,
        avgResponseMs: avgMs,
        difficultyRating: parseInt(params.difficulty ?? '1000', 10),
      })
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'flanker_incongruent', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: result.eloDelta, eloAfter: result.eloAfter } })
    } catch {
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'flanker_incongruent', correct: finalCorrect, total: TOTAL_TRIALS, avgMs, eloDelta: 0, eloAfter: parseInt(params.userELO ?? '1000', 10) } })
    }
  }

  function handleAnswer(dir: Direction) {
    if (phase !== 'stimulus' || respondedRef.current) return
    clearInterval(timerRef.current!)
    respondedRef.current = true
    const rt = Math.round(performance.now() - trialStartRef.current)
    const isCorrect = dir === trials[current].center
    const newCorrect = correct + (isCorrect ? 1 : 0)
    const newTimes = [...responseTimes, rt]

    if (dir === 'left') leftBtnScale.value = withSequence(withSpring(0.88), withSpring(1))
    else rightBtnScale.value = withSequence(withSpring(0.88), withSpring(1))

    flashResult(isCorrect)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      setCorrect(newCorrect)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
    setResponseTimes(newTimes)

    setTimeout(() => advance(newCorrect, newTimes), 300)
  }

  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>
          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🎯</Text>
            <Text style={styles.readyTitle}>Flanker Testi</Text>
            <Text style={styles.readyDesc}>
              Sadece <Text style={styles.bold}>ortadaki</Text> okun yönünü seç.{'\n'}
              Çevresi seni yanıltmaya çalışacak.
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <View style={styles.exampleRow}>
              <View style={styles.exampleCase}>
                <Text style={styles.exampleCaseLabel}>Uyumlu</Text>
                <View style={styles.arrowRowExample}>
                  {['→', '→', '→', '→', '→'].map((a, i) => (
                    <Text key={i} style={[styles.exArrow, i === 2 && styles.exCenterArrow]}>{a}</Text>
                  ))}
                </View>
                <Text style={styles.exampleAnswer}>→ Sağ</Text>
              </View>
              <View style={styles.exDivider} />
              <View style={styles.exampleCase}>
                <Text style={styles.exampleCaseLabel}>Çatışmalı</Text>
                <View style={styles.arrowRowExample}>
                  {['←', '←', '→', '←', '←'].map((a, i) => (
                    <Text key={i} style={[styles.exArrow, i === 2 && styles.exCenterArrowConflict]}>{a}</Text>
                  ))}
                </View>
                <Text style={styles.exampleAnswer}>→ Sağ</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>{TOTAL_TRIALS} deneme</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>2.5s limit</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>50% çatışmalı</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase('fixation') }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'flanker_incongruent'} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const trial = trials[current]

  return (
    <SafeAreaView style={styles.gameContainer}>
      <Animated.View style={bgStyle} />

      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.gameHeaderCenter}>
          <Text style={styles.progressText}>{current + 1} <Text style={styles.progressOf}>/ {TOTAL_TRIALS}</Text></Text>
          <View style={styles.timerTrack}>
            <Animated.View
              style={[styles.timerFill, { width: `${(timeLeft / TIMEOUT_MS) * 100}%` }]}
            />
          </View>
        </View>
        <Text style={styles.correctText}>✓ {correct}</Text>
      </View>

      <View style={styles.stimulusArea}>
        {phase === 'fixation' ? (
          <Text style={styles.fixation}>+</Text>
        ) : (
          <Animated.View style={[styles.arrowContainer, arrowsStyle]}>
            <View style={styles.arrowRow}>
              <Text style={styles.flankerArrow}>{trial.flankers}</Text>
              <Text style={styles.flankerArrow}>{trial.flankers}</Text>
              <Animated.Text style={[styles.centerArrow, centerStyle]}>{trial.center_arrow}</Animated.Text>
              <Text style={styles.flankerArrow}>{trial.flankers}</Text>
              <Text style={styles.flankerArrow}>{trial.flankers}</Text>
            </View>
            {!trial.congruent && (
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictText}>Çatışmalı ⚡</Text>
              </View>
            )}
          </Animated.View>
        )}

        {feedback && (
          <Animated.Text
            entering={FadeInDown.duration(150)}
            style={[styles.feedbackText, feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong]}
          >
            {feedback === 'correct' ? '✓' : '✗'}
          </Animated.Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Animated.View style={[styles.btnWrapper, leftBtnStyle]}>
          <TouchableOpacity
            style={styles.leftButton}
            onPress={() => handleAnswer('left')}
            disabled={phase !== 'stimulus'}
          >
            <Text style={styles.btnArrow}>←</Text>
            <Text style={styles.btnLabel}>Sol</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.btnWrapper, rightBtnStyle]}>
          <TouchableOpacity
            style={styles.rightButton}
            onPress={() => handleAnswer('right')}
            disabled={phase !== 'stimulus'}
          >
            <Text style={styles.btnArrow}>→</Text>
            <Text style={styles.btnLabel}>Sağ</Text>
          </TouchableOpacity>
        </Animated.View>
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
  exampleCard: { backgroundColor: '#F7F9FC', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#E8ECF0' },
  exampleRow: { flexDirection: 'row', alignItems: 'center' },
  exampleCase: { flex: 1, alignItems: 'center', gap: 8 },
  exampleCaseLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  arrowRowExample: { flexDirection: 'row', gap: 2 },
  exArrow: { fontSize: 22, color: '#9CA3AF', fontWeight: '700', width: 26, textAlign: 'center' },
  exCenterArrow: { color: '#1A1A2E', fontSize: 26 },
  exCenterArrowConflict: { color: '#4ECDC4', fontSize: 26 },
  exampleAnswer: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  exDivider: { width: 1, height: 60, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: { backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  // Game
  gameContainer: { flex: 1, backgroundColor: '#0F0F1E' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  gameHeaderCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  exitText: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '300', width: 32 },
  progressText: { fontSize: 18, fontWeight: '900', color: '#fff', minWidth: 44 },
  progressOf: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '400' },
  timerTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: '#4ECDC4', borderRadius: 2 },
  correctText: { fontSize: 15, fontWeight: '700', color: '#4ECDC4', minWidth: 36, textAlign: 'right' },
  stimulusArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fixation: { fontSize: 72, fontWeight: '100', color: 'rgba(255,255,255,0.3)' },
  arrowContainer: { alignItems: 'center', gap: 14 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flankerArrow: { fontSize: 52, color: 'rgba(255,255,255,0.35)', fontWeight: '700', width: 52, textAlign: 'center' },
  centerArrow: { fontSize: 64, color: '#fff', fontWeight: '900', width: 64, textAlign: 'center' },
  conflictBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  conflictText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  feedbackText: { position: 'absolute', fontSize: 48, fontWeight: '900' },
  feedbackCorrect: { color: '#10B981' },
  feedbackWrong: { color: '#EF4444' },
  buttonRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 44, gap: 14 },
  btnWrapper: { flex: 1 },
  leftButton: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 2, borderColor: 'rgba(59,130,246,0.4)', paddingVertical: 28, borderRadius: 20, alignItems: 'center', gap: 4 },
  rightButton: { backgroundColor: 'rgba(78,205,196,0.12)', borderWidth: 2, borderColor: 'rgba(78,205,196,0.4)', paddingVertical: 28, borderRadius: 20, alignItems: 'center', gap: 4 },
  btnArrow: { fontSize: 34, color: '#fff', fontWeight: '900' },
  btnLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
})
