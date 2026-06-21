import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, runOnJS, FadeIn,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { ScientificBacking } from '../../../components/ScientificBacking'
import { GameHeader } from '../../../components/GameHeader'

const SHAPE_COLORS = [
  { name: 'Kırmızı', hex: '#EF4444' },
  { name: 'Mavi',    hex: '#3B82F6' },
  { name: 'Yeşil',   hex: '#10B981' },
  { name: 'Mor',     hex: '#8B5CF6' },
]

const SHAPES = ['circle', 'square', 'triangle'] as const
type ShapeType = typeof SHAPES[number]

const DISTRACT_COLORS = [
  'rgba(239,68,68,0.08)',
  'rgba(59,130,246,0.08)',
  'rgba(16,185,129,0.08)',
  'rgba(245,158,11,0.08)',
  'rgba(139,92,246,0.08)',
  'rgba(236,72,153,0.08)',
]

const TOTAL_PAIR_TRIALS = 8

type Screen = 'ready' | 'playing' | 'done'

interface ShapeStimulus {
  shape: ShapeType
  color: typeof SHAPE_COLORS[number]
}

interface NumberStimulus {
  value: number
  isEven: boolean
}

function randomShape(): ShapeStimulus {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
  }
}

function randomNumber(): NumberStimulus {
  const value = Math.floor(Math.random() * 18) + 1
  return { value, isEven: value % 2 === 0 }
}

function shuffleColors(correct: typeof SHAPE_COLORS[number]): typeof SHAPE_COLORS {
  const others = SHAPE_COLORS.filter((c) => c.name !== correct.name)
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
  const options = [...shuffled, correct].sort(() => Math.random() - 0.5)
  return options
}

export default function MultitaskGame() {
  const params = useLocalSearchParams<{
    gameType: string; domain: string; difficulty: string; userELO: string
  }>()

  const difficulty = params.gameType ?? 'dual_task_easy'
  const isHard = difficulty === 'dual_task_hard'
  const isMedium = difficulty === 'dual_task_medium'

  const SHAPE_INTERVAL = isHard ? 2000 : isMedium ? 3000 : 4000
  const NUMBER_INTERVAL = isHard ? 2500 : isMedium ? 4000 : 5000

  const { post } = useApi()
  const [screen, setScreen] = useState<Screen>('ready')

  const [shapeStimulus, setShapeStimulus] = useState<ShapeStimulus>(randomShape)
  const [shapeOptions, setShapeOptions] = useState<typeof SHAPE_COLORS>(() =>
    shuffleColors(shapeStimulus.color)
  )
  const [numberStimulus, setNumberStimulus] = useState<NumberStimulus>(randomNumber)

  const [shapeCorrect, setShapeCorrect] = useState(0)
  const [numberCorrect, setNumberCorrect] = useState(0)
  const [shapeTotal, setShapeTotal] = useState(0)
  const [numberTotal, setNumberTotal] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])

  const [distractBg, setDistractBg] = useState('transparent')

  const shapeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const numberTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const distractTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gameStartRef = useRef<number>(0)
  const lastActionRef = useRef<number>(0)
  const finishedRef = useRef(false)

  const shapeFlash = useSharedValue(0)
  const shapeFlashColor = useSharedValue('transparent')
  const shapeShakeX = useSharedValue(0)
  const shapeScale = useSharedValue(1)

  const numberFlash = useSharedValue(0)
  const numberFlashColor = useSharedValue('transparent')
  const numberShakeX = useSharedValue(0)
  const numberScale = useSharedValue(1)

  const shapePanelStyle = useAnimatedStyle(() => ({
    backgroundColor: shapeFlashColor.value,
    opacity: 1,
  }))

  const shapeFlashOverlay = useAnimatedStyle(() => ({
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: shapeFlashColor.value,
    opacity: shapeFlash.value,
    borderRadius: 16,
  }))

  const shapeStimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shapeScale.value }, { translateX: shapeShakeX.value }],
  }))

  const numberFlashOverlay = useAnimatedStyle(() => ({
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: numberFlashColor.value,
    opacity: numberFlash.value,
    borderRadius: 16,
  }))

  const numberStimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }, { translateX: numberShakeX.value }],
  }))

  function flashPanel(
    flashVal: typeof shapeFlash,
    colorVal: typeof shapeFlashColor,
    shakeVal: typeof shapeShakeX,
    scaleVal: typeof shapeScale,
    isCorrect: boolean
  ) {
    colorVal.value = isCorrect ? '#10B981' : '#EF4444'
    flashVal.value = withSequence(
      withTiming(0.25, { duration: 60 }),
      withTiming(0, { duration: 300 })
    )
    if (isCorrect) {
      scaleVal.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      )
    } else {
      shakeVal.value = withSequence(
        withTiming(-10, { duration: 45 }),
        withTiming(10, { duration: 45 }),
        withTiming(-7, { duration: 45 }),
        withTiming(7, { duration: 45 }),
        withTiming(0, { duration: 45 })
      )
    }
  }

  function nextShape() {
    const next = randomShape()
    setShapeStimulus(next)
    setShapeOptions(shuffleColors(next.color))
    shapeScale.value = 0.7
    shapeScale.value = withSpring(1, { damping: 10, stiffness: 220 })
  }

  function nextNumber() {
    setNumberStimulus(randomNumber())
    numberScale.value = 0.7
    numberScale.value = withSpring(1, { damping: 10, stiffness: 220 })
  }

  const checkFinish = useCallback(
    (sTotal: number, nTotal: number, sCorrect: number, nCorrect: number, times: number[]) => {
      if (sTotal >= TOTAL_PAIR_TRIALS && nTotal >= TOTAL_PAIR_TRIALS && !finishedRef.current) {
        finishedRef.current = true
        finishGame(sCorrect, nCorrect, times)
      }
    },
    []
  )

  useEffect(() => {
    if (screen !== 'playing') return

    finishedRef.current = false
    gameStartRef.current = performance.now()
    lastActionRef.current = performance.now()

    nextShape()
    nextNumber()

    shapeTimerRef.current = setInterval(() => {
      runOnJS(nextShape)()
    }, SHAPE_INTERVAL)

    numberTimerRef.current = setInterval(() => {
      runOnJS(nextNumber)()
    }, NUMBER_INTERVAL)

    if (isHard) {
      let distractIdx = 0
      distractTimerRef.current = setInterval(() => {
        distractIdx = (distractIdx + 1) % DISTRACT_COLORS.length
        runOnJS(setDistractBg)(DISTRACT_COLORS[distractIdx])
      }, 800)
    }

    return () => {
      clearInterval(shapeTimerRef.current!)
      clearInterval(numberTimerRef.current!)
      if (distractTimerRef.current) clearInterval(distractTimerRef.current)
    }
  }, [screen])

  async function finishGame(
    finalShapeCorrect: number,
    finalNumberCorrect: number,
    times: number[]
  ) {
    clearInterval(shapeTimerRef.current!)
    clearInterval(numberTimerRef.current!)
    if (distractTimerRef.current) clearInterval(distractTimerRef.current)

    const totalTrials = TOTAL_PAIR_TRIALS * 2
    const totalCorrect = finalShapeCorrect + finalNumberCorrect
    const avgMs = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 2000

    try {
      const result = await post<{ eloDelta: number; eloAfter: number }>('/cognitive/session', {
        gameType: params.gameType ?? 'dual_task_easy',
        domain: params.domain ?? 'multitasking',
        totalTrials,
        correctTrials: totalCorrect,
        avgResponseMs: avgMs,
        difficultyRating: parseInt(params.difficulty ?? '1000', 10),
      })
      router.replace({
        pathname: '/cognitive/result',
        params: {
          gameType: params.gameType ?? 'dual_task_easy',
          correct: totalCorrect,
          total: totalTrials,
          avgMs,
          eloDelta: result.eloDelta,
          eloAfter: result.eloAfter,
        },
      })
    } catch {
      router.replace({
        pathname: '/cognitive/result',
        params: {
          gameType: params.gameType ?? 'dual_task_easy',
          correct: totalCorrect,
          total: totalTrials,
          avgMs,
          eloDelta: 0,
          eloAfter: parseInt(params.userELO ?? '1000', 10),
        },
      })
    }
  }

  function handleShapeAnswer(colorName: string) {
    if (screen !== 'playing' || finishedRef.current) return
    const rt = Math.round(performance.now() - lastActionRef.current)
    lastActionRef.current = performance.now()
    const isCorrect = colorName === shapeStimulus.color.name

    flashPanel(shapeFlash, shapeFlashColor, shapeShakeX, shapeScale, isCorrect)

    const newShapeCorrect = shapeCorrect + (isCorrect ? 1 : 0)
    const newShapeTotal = shapeTotal + 1
    const newTimes = [...responseTimes, rt]

    if (isCorrect) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setShapeCorrect(newShapeCorrect)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
    setShapeTotal(newShapeTotal)
    setResponseTimes(newTimes)

    setTimeout(() => nextShape(), 250)
    checkFinish(newShapeTotal, numberTotal, newShapeCorrect, numberCorrect, newTimes)
  }

  function handleNumberAnswer(guessEven: boolean) {
    if (screen !== 'playing' || finishedRef.current) return
    const rt = Math.round(performance.now() - lastActionRef.current)
    lastActionRef.current = performance.now()
    const isCorrect = guessEven === numberStimulus.isEven

    flashPanel(numberFlash, numberFlashColor, numberShakeX, numberScale, isCorrect)

    const newNumberCorrect = numberCorrect + (isCorrect ? 1 : 0)
    const newNumberTotal = numberTotal + 1
    const newTimes = [...responseTimes, rt]

    if (isCorrect) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setNumberCorrect(newNumberCorrect)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
    setNumberTotal(newNumberTotal)
    setResponseTimes(newTimes)

    setTimeout(() => nextNumber(), 250)
    checkFinish(shapeTotal, newNumberTotal, shapeCorrect, newNumberCorrect, newTimes)
  }

  function renderShape(shape: ShapeType, color: string, size = 72) {
    if (shape === 'circle') {
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      )
    }
    if (shape === 'square') {
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: 10,
            backgroundColor: color,
          }}
        />
      )
    }
    return (
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderBottomWidth: size,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    )
  }

  const diffLabel = isHard ? 'Zor' : isMedium ? 'Orta' : 'Kolay'
  const timeLabel = isHard ? '2s limit' : isMedium ? '3s limit' : '4s limit'

  if (screen === 'ready') {
    return (
      <SafeAreaView style={styles.readyContainer}>
        <ScrollView contentContainerStyle={styles.readyScroll}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Oyunlar</Text>
          </TouchableOpacity>

          <View style={styles.readyHero}>
            <Text style={styles.readyEmoji}>🔄</Text>
            <Text style={styles.readyTitle}>Çift Görev</Text>
            <Text style={styles.readyDesc}>
              İki görevi <Text style={styles.bold}>aynı anda</Text> yönet{'\n'}
              — üstte renk, altta sayı.
            </Text>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <View style={styles.previewMini}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6' }} />
                <Text style={styles.previewLabel}>Renk seç</Text>
              </View>
              <Text style={styles.vsSmall}>VS</Text>
              <View style={styles.previewMini}>
                <Text style={styles.previewNumber}>7</Text>
                <Text style={styles.previewLabel}>Tek / Çift</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaText}>{TOTAL_PAIR_TRIALS * 2} cevap</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>{timeLabel}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>{diffLabel}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaText}>Çoklu görev</Text></View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              setScreen('playing')
            }}
          >
            <Text style={styles.startButtonText}>Başla</Text>
          </TouchableOpacity>

          <ScientificBacking gameType={params.gameType ?? 'dual_task_easy'} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const totalAnswered = shapeTotal + numberTotal
  const totalCorrectSoFar = shapeCorrect + numberCorrect

  return (
    <SafeAreaView style={[styles.gameContainer, { backgroundColor: isHard ? distractBg : '#0F0F1E' }]}>
      <GameHeader
        current={totalAnswered}
        total={TOTAL_PAIR_TRIALS * 2}
        correct={totalCorrectSoFar}
        timeLeft={SHAPE_INTERVAL}
        timeTotal={SHAPE_INTERVAL}
        gameLabel="ÇİFT GÖREV"
      />

      <View style={styles.panelsContainer}>
        <Animated.View style={[styles.panel, shapePanelStyle]} entering={FadeIn.duration(300)}>
          <Animated.View style={shapeFlashOverlay} pointerEvents="none" />
          <Text style={styles.panelLabel}>Şeklin rengi nedir?</Text>
          <Animated.View style={[styles.shapeContainer, shapeStimStyle]}>
            {renderShape(shapeStimulus.shape, shapeStimulus.color.hex)}
          </Animated.View>
          <View style={styles.colorOptionsRow}>
            {shapeOptions.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.colorPill, { backgroundColor: c.hex }]}
                onPress={() => handleShapeAnswer(c.name)}
                activeOpacity={0.75}
              >
                <Text style={styles.colorPillText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.separatorLine} />
        </View>

        <Animated.View style={styles.panel} entering={FadeIn.duration(300)}>
          <Animated.View style={numberFlashOverlay} pointerEvents="none" />
          <Text style={styles.panelLabel}>Tek mi, Çift mi?</Text>
          <Animated.Text style={[styles.bigNumber, numberStimStyle]}>
            {numberStimulus.value}
          </Animated.Text>
          <View style={styles.evenOddRow}>
            <TouchableOpacity
              style={styles.evenOddBtn}
              onPress={() => handleNumberAnswer(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.evenOddText}>Tek</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.evenOddBtn, styles.evenOddBtnRight]}
              onPress={() => handleNumberAnswer(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.evenOddText}>Çift</Text>
            </TouchableOpacity>
          </View>
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
  previewCard: {
    backgroundColor: '#F7F9FC', borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#E8ECF0',
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  previewMini: { alignItems: 'center', gap: 8 },
  previewLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  previewNumber: { fontSize: 32, fontWeight: '900', color: '#1A1A2E' },
  vsSmall: { fontSize: 14, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  metaChip: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  startButton: {
    backgroundColor: '#1A1A2E', paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  gameContainer: { flex: 1 },
  panelsContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 0 },

  panel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  panelLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  shapeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },

  colorOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  colorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 2,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  vsBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 10,
  },
  vsText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },

  bigNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 76,
  },
  evenOddRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  evenOddBtn: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  evenOddBtnRight: {
    backgroundColor: 'rgba(78,205,196,0.2)',
    borderColor: 'rgba(78,205,196,0.3)',
  },
  evenOddText: { fontSize: 17, fontWeight: '800', color: '#fff' },
})
