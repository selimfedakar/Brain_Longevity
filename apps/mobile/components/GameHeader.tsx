import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { router } from 'expo-router'

interface Props {
  current: number
  total: number
  correct: number
  timeLeft: number
  timeTotal: number
  gameLabel: string
  onExit?: () => void
}

export function GameHeader({ current, total, correct, timeLeft, timeTotal, gameLabel, onExit }: Props) {
  const timerProgress = timeLeft / timeTotal

  const timerStyle = useAnimatedStyle(() => ({
    width: `${withTiming(timerProgress * 100, { duration: 100 })}%` as unknown as number,
    backgroundColor: withTiming(
      timerProgress > 0.5 ? '#4ECDC4' : timerProgress > 0.25 ? '#F59E0B' : '#EF4444',
      { duration: 100 }
    ),
  }))

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onExit ?? (() => router.back())} hitSlop={12}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.gameLabel}>{gameLabel}</Text>
          <Text style={styles.progress}>{current} / {total}</Text>
        </View>

        <View style={styles.correctBadge}>
          <Text style={styles.correctText}>✓ {correct}</Text>
        </View>
      </View>

      <View style={styles.timerTrack}>
        <Animated.View style={[styles.timerFill, timerStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  exitText: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '300', width: 32 },
  center: { flex: 1, alignItems: 'center' },
  gameLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  progress: { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 22 },
  correctBadge: { width: 32, alignItems: 'flex-end' },
  correctText: { fontSize: 14, fontWeight: '700', color: '#4ECDC4' },
  timerTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  timerFill: { height: 3, borderRadius: 1.5 },
})
