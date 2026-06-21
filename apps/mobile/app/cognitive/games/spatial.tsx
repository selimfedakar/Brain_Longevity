import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, runOnJS, FadeIn, FadeInDown,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'
import { GameHeader } from '../../../components/GameHeader'

const GRID_SIZE = 4
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE
const TOTAL_ROUNDS = 8
const HIGHLIGHT_MS = 600
const PAUSE_MS = 300

type Screen = 'ready' | 'showing' | 'recall' | 'done'

function getSequenceLength(gameType: string, difficulty: number): number {
  if (gameType === 'mental_rotation_2d') {
    if (difficulty < 950) return 4
    if (difficulty < 1100) return 5
    if (difficulty < 1250) return 6
    return 7
  }
  if (difficulty < 950) return 3
  if (difficulty < 1100) return 4
  if (difficulty < 1250) return 5
  return 6
}

function generateSequence(length: number): number[] {
  const seq: number[] = []
  while (seq.length < length) {
    const idx = Math.floor(Math.random() * TOTAL_CELLS)
    if (!seq.includes(idx)) seq.push(idx)
  }
  return seq
}

interface BlockProps {
  index: number
  isActive: boolean
  isSelected: boolean
  isRecall: boolean
  onPress: (index: number) => void
  cellSize: number
  flashColor: string | null
}

function Block({ index, isActive, isSelected, isRecall, onPress, cellSize, flashColor }: BlockProps) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.08, { damping: 10, stiffness: 200 })
      opacity.value = withTiming(1, { duration: 200 })
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 })
      opacity.value = withTiming(0.85, { duration: 150 })
    }
  }, [isActive])

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.05, { damping: 10, stiffness: 220 })
    } else if (!isActive) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 })
    }
  }, [isSelected])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  let bg = '#1E1E2E'
  if (isActive) bg = '#FFD700'
  else if (isSelected) bg = '#22D3EE'
  else if (flashColor) bg = flashColor

  return (
    <Animated.View
      entering={FadeIn.delay(index * 30).duration(200)}
      style={[animStyle, { margin: 4 }]}
    >
      <TouchableOpacity
        onPress={() => isRecall && onPress(index)}
        activeOpacity={isRecall ? 0.7 : 1}
        style={[
          styles.block,
          { width: cellSize, height: cellSize, backgroundColor: bg },
          isActive && styles.blockActive,
          isSelected && styles.blockSelected,
        ]}
      />
    </Animated.View>
  )
}

export default function SpatialGame() {
  const params = useLocalSearchParams<{ gameType: string; domain: string; difficulty: string; userELO: string }>()
  const { width } = useWindowDimensions()
  const { post } = useApi()

  const gameType = params.gameType ?? 'spatial_span'
  const difficulty = parseInt(params.difficulty ?? '1050', 10)
  const seqLen = getSequenceLength(gameType, difficulty)

  const cellSize = Math.floor((width - 48 - (GRID_SIZE - 1) * 8) / GRID_SIZE)

  const [screen, setScreen] = useState<Screen>('ready')
  const [round, setRound] = useState(0)
  const [correctRounds, setCorrectRounds] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [sequence, setSequence] = useState<number[]>([])
  const [showingIndex, setShowingIndex] = useState(-1)
  const [userInput, setUserInput] = useState<number[]>([])
  const [flashColor, setFlashColor] = useState<string | null>(null)
  const [shownCount, setShownCount] = useState(0)

  const recallStartRef = useRef<number>(0)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gridFlashColor = useSharedValue<string>('transparent')
  const gridFlashOpacity = useSharedValue(0)

  const gridFlashStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: gridFlashColor.value,
    opacity: gridFlashOpacity.value,
    borderRadius: 12,
  }))

  function clearShowTimer() {
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
  }

  const startRecall = useCallback(() => {
    setShowingIndex(-1)
    setShownCount(seqLen)
    recallStartRef.current = performance.now()
    setScreen('recall')
  }, [seqLen])

  function playSequence(seq: number[]) {
    setScreen('showing')
    setShowingIndex(-1)
    setShownCount(0)

    let step = 0

    function showNext() {
      if (step >= seq.length) {
        clearShowTimer()
        runOnJS(startRecall)()
        return
      }
      setShowingIndex(seq[step])
      setShownCount(step + 1)
      step++
      showTimerRef.current = setTimeout(() => {
        setShowingIndex(-1)
        showTimerRef.current = setTimeout(showNext, PAUSE_MS)
      }, HIGHLIGHT_MS)
    }

    showTimerRef.current = setTimeout(showNext, 400)
  }

  function startRound(roundIndex: number) {
    const seq = generateSequence(seqLen)
    setSequence(seq)
    setUserInput([])
    setFlashColor(null)
    setRound(roundIndex)
    playSequence(seq)
  }

  const handleFinish = useCallback(
    async (finalCorrect: number, finalTimes: number[]) => {
      setScreen('done')
      const avgMs = finalTimes.length
        ? Math.round(finalTimes.reduce((a, b) => a + b, 0) / finalTimes.length)
        : 2000
      try {
        const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
          gameType,
          domain: params.domain ?? 'spatial',
          totalTrials: TOTAL_ROUNDS,
          correctTrials: finalCorrect,
          avgResponseMs: avgMs,
          difficultyRating: difficulty,
        })
        router.replace({
          pathname: '/cognitive/result',
          params: {
            gameType,
            correct: finalCorrect,
            total: TOTAL_ROUNDS,
            avgMs,
            eloDelta: result.eloDelta,
            eloAfter: result.eloAfter,
          },
        })
      } catch {
        router.replace({
          pathname: '/cognitive/result',
          params: {
            gameType,
            correct: finalCorrect,
            total: TOTAL_ROUNDS,
            avgMs,
            eloDelta: 0,
            eloAfter: parseInt(params.userELO ?? '1050', 10),
          },
        })
      }
    },
    [gameType, difficulty, params.domain, params.userELO]
  )

  function flashGrid(isCorrect: boolean, onDone: () => void) {
    const color = isCorrect ? '#10B981' : '#EF4444'
    gridFlashColor.value = color
    gridFlashOpacity.value = withSequence(
      withTiming(0.35, { duration: 80 }),
      withTiming(0, { duration: 350 })
    )
    setTimeout(onDone, 450)
  }

  function handleBlockPress(index: number) {
    if (screen !== 'recall') return
    if (userInput.includes(index)) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newInput = [...userInput, index]
    setUserInput(newInput)

    const pos = newInput.length - 1
    if (sequence[pos] !== index) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const rt = Math.round(performance.now() - recallStartRef.current)
      const newTimes = [...responseTimes, rt]
      setResponseTimes(newTimes)

      setScreen('showing')
      flashGrid(false, () => {
        const nextRound = round + 1
        if (nextRound >= TOTAL_ROUNDS) {
          handleFinish(correctRounds, newTimes)
        } else {
          startRound(nextRound)
        }
      })
      return
    }

    if (newInput.length === sequence.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const rt = Math.round(performance.now() - recallStartRef.current)
      const newCorrect = correctRounds + 1
      const newTimes = [...responseTimes, rt]
      setCorrectRounds(newCorrect)
      setResponseTimes(newTimes)

      setScreen('showing')
      flashGrid(true, () => {
        const nextRound = round + 1
        if (nextRound >= TOTAL_ROUNDS) {
          handleFinish(newCorrect, newTimes)
        } else {
          startRound(nextRound)
        }
      })
    }
  }

  useEffect(() => {
    return () => clearShowTimer()
  }, [])

  if (screen === 'ready') {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>

          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🧩</Text>
            <Text style={styles.readyTitle}>Uzamsal Bellek</Text>
            <Text style={styles.readyDesc}>
              Işıklanan kareleri hatırla ve{'\n'}
              <Text style={styles.bold}>aynı sırayla</Text> dokun.
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>8 tur</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>4×4 ızgara</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>Uzamsal test</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              startRound(0)
            }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={gameType} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const isRecallMode = screen === 'recall'

  return (
    <SafeAreaView style={styles.gameContainer}>
      <GameHeader
        current={round + 1}
        total={TOTAL_ROUNDS}
        correct={correctRounds}
        timeLeft={1}
        timeTotal={1}
        gameLabel="UZAMSAL BELLEK"
      />

      <Animated.View entering={FadeInDown.duration(300)} style={styles.statusArea}>
        <Text style={styles.statusText}>
          {isRecallMode ? 'Şimdi tekrarla!' : 'Sırayı izle...'}
        </Text>
        {!isRecallMode && (
          <View style={styles.progressDots}>
            {sequence.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < shownCount && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        )}
        {isRecallMode && (
          <View style={styles.progressDots}>
            {sequence.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < userInput.length && styles.progressDotRecall,
                ]}
              />
            ))}
          </View>
        )}
      </Animated.View>

      <View style={styles.gridWrapper}>
        <View style={styles.gridContainer}>
          {Array.from({ length: TOTAL_CELLS }, (_, idx) => (
            <Block
              key={idx}
              index={idx}
              isActive={showingIndex === idx}
              isSelected={isRecallMode && userInput.includes(idx)}
              isRecall={isRecallMode}
              onPress={handleBlockPress}
              cellSize={cellSize}
              flashColor={flashColor}
            />
          ))}
          <Animated.View style={gridFlashStyle} pointerEvents="none" />
        </View>
      </View>

      {isRecallMode && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.recallHint}>
          <Text style={styles.recallHintText}>
            {userInput.length} / {sequence.length} seçildi
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  readyContainer: { flex: 1, backgroundColor: '#fff' },
  readyScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  readyHero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  readyEmoji: { fontSize: 64 },
  readyTitle: { fontSize: 30, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.5 },
  readyDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 25 },
  bold: { fontWeight: '800', color: '#1A1A2E' },
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
  statusArea: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, gap: 12 },
  statusText: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: { backgroundColor: '#FFD700' },
  progressDotRecall: { backgroundColor: '#22D3EE' },

  gridWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 16,
  },
  block: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  blockActive: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  blockSelected: {
    shadowColor: '#22D3EE',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },

  recallHint: { alignItems: 'center', paddingBottom: 24 },
  recallHintText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 0.5 },
})
