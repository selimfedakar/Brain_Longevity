import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withRepeat, cancelAnimation, FadeIn,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'
import { GameHeader } from '../../../components/GameHeader'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const TOTAL_TRIALS = 22
const N = 2
const STIMULUS_MS = 2000
const ISI_MS = 400

function generateSequence(): string[] {
  const seq: string[] = []
  for (let i = 0; i < TOTAL_TRIALS; i++) {
    if (i >= N && Math.random() < 0.3) {
      seq.push(seq[i - N])
    } else {
      const others = LETTERS.filter((l) => l !== seq[i - 1])
      seq.push(others[Math.floor(Math.random() * others.length)])
    }
  }
  return seq
}

type Phase = 'ready' | 'stimulus' | 'isi' | 'done'

export default function NBackGame() {
  const params = useLocalSearchParams<{ gameType: string; domain: string; difficulty: string; userELO: string }>()
  const [phase, setPhase] = useState<Phase>('ready')
  const [sequence] = useState<string[]>(generateSequence)
  const [current, setCurrent] = useState(0)
  const [pressed, setPressed] = useState(false)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [falseAlarms, setFalseAlarms] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const stimulusStartRef = useRef<number>(0)
  const phaseRef = useRef<Phase>('ready')
  const { post } = useApi()

  // Animations
  const cardScale = useSharedValue(0.5)
  const cardOpacity = useSharedValue(0)
  const matchButtonScale = useSharedValue(1)
  const matchBorderOpacity = useSharedValue(0.4)
  const feedbackOpacity = useSharedValue(0)
  const feedbackColor = useSharedValue('#10B981')

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }))
  const matchButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: matchButtonScale.value }],
    borderColor: `rgba(78, 205, 196, ${matchBorderOpacity.value})`,
  }))
  const feedbackStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    backgroundColor: feedbackColor.value,
    opacity: feedbackOpacity.value,
    pointerEvents: 'none',
  }))

  function animateStimulusIn() {
    cardScale.value = 0.5
    cardOpacity.value = 0
    cardScale.value = withSpring(1, { damping: 12, stiffness: 250 })
    cardOpacity.value = withTiming(1, { duration: 120 })
  }

  function animateStimulusOut() {
    cardScale.value = withTiming(1.1, { duration: 100 })
    cardOpacity.value = withTiming(0, { duration: 180 })
  }

  function showFeedback(correct: boolean) {
    feedbackColor.value = correct ? '#10B981' : '#EF4444'
    feedbackOpacity.value = withSequence(
      withTiming(0.15, { duration: 60 }),
      withTiming(0, { duration: 250 })
    )
  }

  const isTarget = (i: number) => i >= N && sequence[i] === sequence[i - N]

  phaseRef.current = phase

  useEffect(() => {
    if (phase !== 'stimulus') return

    animateStimulusIn()
    stimulusStartRef.current = performance.now()

    const timer = setTimeout(() => {
      if (isTarget(current) && !pressed) {
        setMisses((m) => m + 1)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      animateStimulusOut()
      setTimeout(() => {
        if (current + 1 >= TOTAL_TRIALS) {
          endGame()
        } else {
          setCurrent((c) => c + 1)
          setPhase('stimulus')
          setPressed(false)
        }
      }, ISI_MS)
    }, STIMULUS_MS)

    return () => clearTimeout(timer)
  }, [phase, current])

  async function endGame() {
    setPhase('done')
    const effectiveTrials = TOTAL_TRIALS - N
    const correctNonTargets = effectiveTrials - misses - falseAlarms - hits
    const correctTrials = Math.max(0, hits + correctNonTargets)
    const avgMs = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : STIMULUS_MS
    try {
      const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
        gameType: params.gameType ?? 'n_back_2',
        domain: params.domain ?? 'working_memory',
        totalTrials: effectiveTrials,
        correctTrials,
        avgResponseMs: avgMs,
        difficultyRating: parseInt(params.difficulty ?? '1000', 10),
      })
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'n_back_2', correct: correctTrials, total: effectiveTrials, avgMs, eloDelta: result.eloDelta, eloAfter: result.eloAfter } })
    } catch {
      router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'n_back_2', correct: correctTrials, total: effectiveTrials, avgMs, eloDelta: 0, eloAfter: parseInt(params.userELO ?? '1000', 10) } })
    }
  }

  function handleMatch() {
    if (phase !== 'stimulus' || pressed) return
    setPressed(true)
    const rt = Math.round(performance.now() - stimulusStartRef.current)

    matchButtonScale.value = withSequence(withSpring(0.9), withSpring(1))

    if (isTarget(current)) {
      setHits((h) => h + 1)
      setResponseTimes((prev) => [...prev, rt])
      showFeedback(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } else {
      setFalseAlarms((fa) => fa + 1)
      showFeedback(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>
          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🗂️</Text>
            <Text style={styles.readyTitle}>{N}-Back Testi</Text>
            <Text style={styles.readyDesc}>
              Mevcut harf <Text style={styles.bold}>{N} adım öncekiyle</Text> aynıysa
              "Eşleşme" butonuna bas.
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Örnek akış</Text>
            <View style={styles.exampleFlow}>
              {['K', 'B', 'K', '?'].map((l, i) => (
                <View key={i} style={[styles.exampleCell, i === 0 && styles.exampleCellMatch, i === 3 && styles.exampleCellTarget]}>
                  <Text style={[styles.exampleLetter, (i === 0 || i === 3) && styles.exampleLetterHighlight]}>{l}</Text>
                </View>
              ))}
            </View>
            <View style={styles.exampleArrow}>
              <View style={styles.arrowLine} />
              <Text style={styles.arrowLabel}>2 geri = K → EŞLEŞME</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>{TOTAL_TRIALS} uyaran</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>N = {N}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>~30% hedef</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase('stimulus') }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'n_back_2'} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const historySlice = sequence.slice(Math.max(0, current - N), current)

  return (
    <SafeAreaView style={styles.gameContainer}>
      <Animated.View style={feedbackStyle} />

      <View style={styles.gameTop}>
        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{current + 1}</Text>
            <Text style={styles.statLbl}>/ {TOTAL_TRIALS}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#4ECDC4' }]}>{hits}</Text>
            <Text style={styles.statLbl}>isabet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{misses + falseAlarms}</Text>
            <Text style={styles.statLbl}>hata</Text>
          </View>
        </View>

        <View style={styles.nBadge}>
          <Text style={styles.nBadgeText}>N={N}</Text>
        </View>
      </View>

      <View style={styles.historyArea}>
        <Text style={styles.historyLabel}>Son {N} uyaran</Text>
        <View style={styles.historyRow}>
          {Array.from({ length: N }).map((_, i) => {
            const letter = historySlice[i]
            return (
              <View key={i} style={[styles.historyCell, !letter && styles.historyCellEmpty]}>
                <Text style={styles.historyLetter}>{letter ?? '—'}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.stimulusArea}>
        {phase === 'stimulus' ? (
          <Animated.View style={[styles.stimCard, cardStyle]}>
            <Text style={styles.stimLetter}>{sequence[current]}</Text>
          </Animated.View>
        ) : (
          <View style={styles.stimCardBlank} />
        )}
      </View>

      <View style={styles.matchArea}>
        <Text style={styles.matchHint}>
          {current < N ? `Isınma turu (${N - current} kaldı)` : 'Eşleşiyor mu?'}
        </Text>
        <Animated.View style={matchButtonStyle}>
          <TouchableOpacity
            style={[styles.matchButton, pressed && styles.matchButtonPressed, current < N && styles.matchButtonDisabled]}
            onPress={handleMatch}
            disabled={pressed || current < N || phase !== 'stimulus'}
            activeOpacity={0.8}
          >
            <Text style={styles.matchButtonText}>{pressed && isTarget(current) ? '✓ Eşleşme!' : 'Eşleşme'}</Text>
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
  exampleCard: { backgroundColor: '#F7F9FC', borderRadius: 16, padding: 20, gap: 16, borderWidth: 1, borderColor: '#E8ECF0' },
  exampleLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', textAlign: 'center' },
  exampleFlow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  exampleCell: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  exampleCellMatch: { backgroundColor: 'rgba(78,205,196,0.2)', borderWidth: 2, borderColor: '#4ECDC4' },
  exampleCellTarget: { backgroundColor: '#1A1A2E' },
  exampleLetter: { fontSize: 22, fontWeight: '800', color: '#374151' },
  exampleLetterHighlight: { color: '#4ECDC4' },
  exampleArrow: { alignItems: 'center', gap: 6 },
  arrowLine: { width: '60%', height: 1, backgroundColor: '#D1D5DB' },
  arrowLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: { backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  // Game
  gameContainer: { flex: 1, backgroundColor: '#0F0F1E' },
  gameTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  gameStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  nBadge: { backgroundColor: 'rgba(78,205,196,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)' },
  nBadgeText: { fontSize: 13, color: '#4ECDC4', fontWeight: '700' },
  historyArea: { alignItems: 'center', paddingTop: 24, gap: 8 },
  historyLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5 },
  historyRow: { flexDirection: 'row', gap: 12 },
  historyCell: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  historyCellEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' },
  historyLetter: { fontSize: 20, fontWeight: '800', color: '#4ECDC4' },
  stimulusArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stimCard: { width: 160, height: 160, borderRadius: 28, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(78,205,196,0.3)', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  stimLetter: { fontSize: 80, fontWeight: '900', color: '#fff' },
  stimCardBlank: { width: 160, height: 160, borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' },
  matchArea: { paddingHorizontal: 24, paddingBottom: 44, alignItems: 'center', gap: 12 },
  matchHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 },
  matchButton: { paddingVertical: 22, paddingHorizontal: 72, borderRadius: 18, backgroundColor: 'rgba(78,205,196,0.12)', borderWidth: 2, borderColor: 'rgba(78,205,196,0.4)' },
  matchButtonPressed: { backgroundColor: 'rgba(78,205,196,0.25)' },
  matchButtonDisabled: { opacity: 0.2 },
  matchButtonText: { fontSize: 20, fontWeight: '800', color: '#4ECDC4', letterSpacing: 0.5 },
})
