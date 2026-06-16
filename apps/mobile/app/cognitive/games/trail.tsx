import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withRepeat, cancelAnimation, FadeIn,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'

// TMT-B sequence: 1→A→2→B→3→C→4→D→5
const SEQUENCE = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5']

// Fixed positions (percentage of container) for natural trail feel
const POSITIONS: Record<string, { x: number; y: number }> = {
  '1': { x: 15, y: 12 },
  'A': { x: 60, y: 8  },
  '2': { x: 82, y: 30 },
  'B': { x: 45, y: 28 },
  '3': { x: 18, y: 50 },
  'C': { x: 68, y: 52 },
  '4': { x: 38, y: 72 },
  'D': { x: 78, y: 78 },
  '5': { x: 20, y: 85 },
}

const NODE_SIZE = 64
const { width: SCREEN_W } = Dimensions.get('window')
const CONTAINER_W = SCREEN_W - 32
const CONTAINER_H = 380

export default function TrailGame() {
  const params = useLocalSearchParams<{ gameType: string; domain: string; difficulty: string; userELO: string }>()
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState(0)
  const [errorNode, setErrorNode] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [completedEdges, setCompletedEdges] = useState<string[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { post } = useApi()

  // Node pulse animation for "next" node
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.6)

  useEffect(() => {
    if (!started) return
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1, true
    )
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 600 }), withTiming(0.5, { duration: 600 })),
      -1, true
    )
    return () => { cancelAnimation(pulseScale); cancelAnimation(pulseOpacity) }
  }, [started, step])

  useEffect(() => {
    if (!started) return
    startTimeRef.current = performance.now()
    timerRef.current = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startTimeRef.current))
    }, 100)
    return () => clearInterval(timerRef.current!)
  }, [started])

  const endGame = useCallback(
    async (totalErrors: number, totalMs: number) => {
      clearInterval(timerRef.current!)
      cancelAnimation(pulseScale)
      cancelAnimation(pulseOpacity)
      const correctTrials = Math.max(0, SEQUENCE.length - 1 - totalErrors)
      const avgMs = Math.round(totalMs / Math.max(1, SEQUENCE.length - 1))
      try {
        const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
          gameType: params.gameType ?? 'trail_making_b',
          domain: params.domain ?? 'executive_function',
          totalTrials: SEQUENCE.length - 1,
          correctTrials,
          avgResponseMs: avgMs,
          difficultyRating: parseInt(params.difficulty ?? '1200', 10),
        })
        router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'trail_making_b', correct: correctTrials, total: SEQUENCE.length - 1, avgMs, eloDelta: result.eloDelta, eloAfter: result.eloAfter, trailTimeMs: totalMs, trailErrors: totalErrors } })
      } catch {
        router.replace({ pathname: '/cognitive/result', params: { gameType: params.gameType ?? 'trail_making_b', correct: correctTrials, total: SEQUENCE.length - 1, avgMs, eloDelta: 0, eloAfter: parseInt(params.userELO ?? '1000', 10), trailTimeMs: totalMs, trailErrors: totalErrors } })
      }
    },
    [params, post]
  )

  function handleTap(label: string) {
    if (!started) return
    const expected = SEQUENCE[step]
    if (label === expected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (step > 0) {
        setCompletedEdges((prev) => [...prev, `${SEQUENCE[step - 1]}-${label}`])
      }
      const nextStep = step + 1
      if (nextStep >= SEQUENCE.length) {
        const totalMs = Math.round(performance.now() - startTimeRef.current)
        endGame(errors, totalMs)
      } else {
        setStep(nextStep)
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrors((e) => e + 1)
      setErrorNode(label)
      setTimeout(() => setErrorNode(null), 500)
    }
  }

  function getNodeCenter(label: string) {
    const pos = POSITIONS[label]
    return {
      x: (pos.x / 100) * CONTAINER_W + NODE_SIZE / 2,
      y: (pos.y / 100) * CONTAINER_H + NODE_SIZE / 2,
    }
  }

  function getLineStyle(from: string, to: string) {
    const a = getNodeCenter(from)
    const b = getNodeCenter(to)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    return {
      position: 'absolute' as const,
      left: a.x,
      top: a.y - 1.5,
      width: length,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#4ECDC4',
      opacity: 0.8,
      transformOrigin: '0% 50%' as unknown as undefined,
      transform: [{ rotate: `${angle}deg` }],
    }
  }

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  if (!started) {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>
          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🗺️</Text>
            <Text style={styles.readyTitle}>Trail Making B</Text>
            <Text style={styles.readyDesc}>
              Sırayla <Text style={styles.bold}>rakam → harf → rakam</Text> dokunarak{'\n'}
              1 → A → 2 → B → 3 → C... tamamla.
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Sıra</Text>
            <View style={styles.seqPreview}>
              {SEQUENCE.map((s, i) => (
                <View key={i} style={styles.seqItem}>
                  <View style={[styles.seqNode, /\d/.test(s) ? styles.seqNodeNum : styles.seqNodeLetter]}>
                    <Text style={styles.seqNodeText}>{s}</Text>
                  </View>
                  {i < SEQUENCE.length - 1 && <Text style={styles.seqArrow}>→</Text>}
                </View>
              ))}
            </View>
            <Text style={styles.exampleNote}>Süre ölçülüyor — hatalar süreyi uzatır</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>9 nokta</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>Klinik standart</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>Süre ölçülür</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStarted(true) }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'trail_making_b'} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const nextLabel = SEQUENCE[step]

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.exitBtn}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏱ {(elapsedMs / 1000).toFixed(1)}s</Text>
        </View>
        <View style={styles.nextBadge}>
          <Text style={styles.nextLabel}>Sıradaki</Text>
          <Text style={[styles.nextTarget, /\d/.test(nextLabel) ? styles.nextTargetNum : styles.nextTargetLetter]}>
            {nextLabel}
          </Text>
        </View>
        <View style={styles.errorBadge}>
          {errors > 0 && <Text style={styles.errorText}>✗ {errors}</Text>}
        </View>
      </View>

      <View style={styles.progressDots}>
        {SEQUENCE.map((s, i) => (
          <View key={i} style={[styles.dot, i < step && styles.dotDone, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={[styles.canvas, { width: CONTAINER_W, height: CONTAINER_H }]}>
        {/* Completed path lines */}
        {completedEdges.map((edge) => {
          const [from, to] = edge.split('-')
          return <View key={edge} style={getLineStyle(from, to)} />
        })}

        {/* Nodes */}
        {SEQUENCE.map((label) => {
          const pos = POSITIONS[label]
          const seqIdx = SEQUENCE.indexOf(label)
          const isCompleted = seqIdx < step
          const isNext = label === nextLabel
          const isError = label === errorNode
          const isNum = /\d/.test(label)

          return (
            <View
              key={label}
              style={[
                styles.nodeWrapper,
                {
                  position: 'absolute',
                  left: (pos.x / 100) * CONTAINER_W,
                  top: (pos.y / 100) * CONTAINER_H,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                },
              ]}
            >
              {isNext && (
                <Animated.View
                  style={[styles.nodePulseRing, isNum ? styles.pulseRingNum : styles.pulseRingLetter, pulseStyle]}
                />
              )}
              <TouchableOpacity
                style={[
                  styles.node,
                  isNum ? styles.nodeNum : styles.nodeLetter,
                  isCompleted && styles.nodeCompleted,
                  isNext && (isNum ? styles.nodeNextNum : styles.nodeNextLetter),
                  isError && styles.nodeError,
                ]}
                onPress={() => handleTap(label)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.nodeLabel,
                  isCompleted && styles.nodeLabelCompleted,
                  isNext && styles.nodeLabelNext,
                  isError && styles.nodeLabelError,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  exitBtn: { position: 'absolute', left: 24, zIndex: 1 },
  exitText: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  readyContainer: { flex: 1, backgroundColor: '#fff' },
  readyScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 20 },
  readyHero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  readyEmoji: { fontSize: 64 },
  readyTitle: { fontSize: 30, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.5 },
  readyDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 25 },
  bold: { fontWeight: '800', color: '#1A1A2E' },
  exampleCard: { backgroundColor: '#F7F9FC', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#E8ECF0', alignItems: 'center' },
  exampleLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  seqPreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  seqItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seqNode: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seqNodeNum: { backgroundColor: '#1A1A2E' },
  seqNodeLetter: { backgroundColor: '#4ECDC4' },
  seqNodeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  seqArrow: { fontSize: 12, color: '#D1D5DB' },
  exampleNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: { backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  // Game
  gameContainer: { flex: 1, backgroundColor: '#0F0F1E', alignItems: 'center' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  timerBadge: { minWidth: 80 },
  timerText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  nextBadge: { alignItems: 'center' },
  nextLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 },
  nextTarget: { fontSize: 36, fontWeight: '900', lineHeight: 42 },
  nextTargetNum: { color: '#fff' },
  nextTargetLetter: { color: '#4ECDC4' },
  errorBadge: { minWidth: 48, alignItems: 'flex-end' },
  errorText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  progressDots: { flexDirection: 'row', gap: 6, paddingBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotDone: { backgroundColor: '#4ECDC4' },
  dotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },
  canvas: { position: 'relative', marginHorizontal: 16 },
  nodeWrapper: { zIndex: 2 },
  nodePulseRing: { position: 'absolute', width: NODE_SIZE + 16, height: NODE_SIZE + 16, borderRadius: (NODE_SIZE + 16) / 2, borderWidth: 2, top: -8, left: -8 },
  pulseRingNum: { borderColor: 'rgba(255,255,255,0.4)' },
  pulseRingLetter: { borderColor: 'rgba(78,205,196,0.6)' },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  nodeNum: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  nodeLetter: { backgroundColor: 'rgba(78,205,196,0.08)', borderColor: 'rgba(78,205,196,0.25)' },
  nodeCompleted: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', opacity: 0.5 },
  nodeNextNum: { backgroundColor: '#1A1A2E', borderColor: '#fff', borderWidth: 2.5 },
  nodeNextLetter: { backgroundColor: 'rgba(78,205,196,0.2)', borderColor: '#4ECDC4', borderWidth: 2.5 },
  nodeError: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#EF4444' },
  nodeLabel: { fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.5)' },
  nodeLabelCompleted: { color: '#10B981' },
  nodeLabelNext: { color: '#fff' },
  nodeLabelError: { color: '#EF4444' },
})
