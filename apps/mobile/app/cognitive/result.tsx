import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ScientificBacking } from '../../components/ScientificBacking'
import { Colors } from '../../constants/colors'

const GAME_LABELS: Record<string, string> = {
  stroop_classic: 'Stroop Testi',
  stroop_complex: 'Stroop (Karmaşık)',
  n_back_2: '2-Back Testi',
  n_back_1: '1-Back Testi',
  n_back_3: '3-Back Testi',
  flanker_incongruent: 'Flanker Testi',
  flanker_congruent: 'Flanker (Uyumlu)',
  trail_making_b: 'Trail Making B',
  trail_making_a: 'Trail Making A',
}

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    gameType: string
    correct: string
    total: string
    avgMs: string
    eloDelta: string
    eloAfter: string
    trailTimeMs?: string
    trailErrors?: string
  }>()

  const correct = parseInt(params.correct ?? '0', 10)
  const total = parseInt(params.total ?? '1', 10)
  const avgMs = parseInt(params.avgMs ?? '0', 10)
  const eloDelta = parseInt(params.eloDelta ?? '0', 10)
  const eloAfter = parseInt(params.eloAfter ?? '1000', 10)
  const accuracy = Math.round((correct / total) * 100)
  const gameType = params.gameType ?? 'stroop_classic'
  const isTrail = gameType.startsWith('trail')

  const isGood = accuracy >= 80
  const emoji = accuracy >= 90 ? '🏆' : accuracy >= 70 ? '💪' : '📈'
  const message = accuracy >= 90
    ? 'Mükemmel performans!'
    : accuracy >= 70
    ? 'İyi iş, devam et!'
    : 'Pratik yaparak gelişeceksin.'

  const eloColor = eloDelta > 0 ? Colors.success : eloDelta < 0 ? Colors.error : Colors.textSecondary
  const eloSign = eloDelta > 0 ? '+' : ''

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.gameLabel}>{GAME_LABELS[gameType] ?? gameType}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.scoreCard}>
          <Text style={[styles.accuracyScore, isGood ? styles.scoreGood : styles.scoreMedium]}>
            {accuracy}%
          </Text>
          <Text style={styles.accuracyLabel}>Doğruluk</Text>
          <Text style={styles.trialsText}>{correct} / {total} doğru</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{avgMs < 1000 ? `${avgMs}ms` : `${(avgMs / 1000).toFixed(1)}s`}</Text>
            <Text style={styles.statLabel}>Ort. Tepki Süresi</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: eloColor }]}>
              {eloSign}{eloDelta}
            </Text>
            <Text style={styles.statLabel}>ELO Değişimi</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{eloAfter}</Text>
            <Text style={styles.statLabel}>Yeni ELO</Text>
          </View>
          {isTrail && params.trailTimeMs && (
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{(parseInt(params.trailTimeMs, 10) / 1000).toFixed(1)}s</Text>
              <Text style={styles.statLabel}>Tamamlama Süresi</Text>
            </View>
          )}
        </View>

        <View style={styles.eloBar}>
          <View style={styles.eloBarFill} />
          <Text style={styles.eloBarText}>ELO: {eloAfter}</Text>
        </View>

        <View style={styles.scienceSection}>
          <ScientificBacking gameType={gameType} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(tabs)/cognitive')}
          >
            <Text style={styles.secondaryButtonText}>Diğer Testler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 20 },
  header: { alignItems: 'center', gap: 8 },
  emoji: { fontSize: 56 },
  gameLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  message: { fontSize: 20, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  accuracyScore: { fontSize: 80, fontWeight: '900', lineHeight: 88 },
  scoreGood: { color: Colors.success },
  scoreMedium: { color: Colors.warning },
  accuracyLabel: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  trialsText: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCell: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  eloBar: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  eloBarFill: {},
  eloBarText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  scienceSection: {},
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: { color: Colors.primary, fontSize: 17, fontWeight: '600' },
})
