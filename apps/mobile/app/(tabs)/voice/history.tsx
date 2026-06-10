import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { Colors } from '../../../constants/colors'

interface Session {
  id: string
  promptType: string
  durationSeconds: number
  wordCount: number
  fluencyScore: number
  recordedAt: string
}

interface TrendPoint { date: string; score: number; trend7d: number | null }

const PROMPT_LABELS: Record<string, string> = {
  free_journal: 'Serbest Günlük',
  story_recall: 'Anı Hatırlama',
  image_narration: 'Görsel Anlatım',
  word_association: 'Kelime İlişkisi',
}

export default function VoiceHistoryScreen() {
  const { get } = useApi()
  const [sessions, setSessions] = useState<Session[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<{ sessions: Session[]; trend: TrendPoint[] }>('/voice/history')
      .then(d => { setSessions(d.sessions); setTrend(d.trend) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avgScore = trend.length > 0
    ? Math.round(trend.slice(0, 7).reduce((s, t) => s + t.score, 0) / Math.min(7, trend.length))
    : null

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Kayıt Geçmişi</Text>
          <View style={{ width: 24 }} />
        </View>

        {avgScore !== null && (
          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>7 Günlük Ortalama</Text>
            <Text style={[styles.avgScore, {
              color: avgScore >= 70 ? Colors.success : avgScore >= 45 ? Colors.warning : Colors.error,
            }]}>{avgScore}</Text>
            <Text style={styles.avgSub}>Zihinsel Akıcılık Skoru</Text>
          </View>
        )}

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.emptyLink}>İlk kaydınızı yapın →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Son Kayıtlar</Text>
            {sessions.map(s => {
              const scoreColor = s.fluencyScore >= 70 ? Colors.success
                : s.fluencyScore >= 45 ? Colors.warning : Colors.error
              return (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionType}>{PROMPT_LABELS[s.promptType] ?? s.promptType}</Text>
                    <Text style={styles.sessionMeta}>
                      {s.wordCount} kelime · {Math.floor(s.durationSeconds / 60)}:{String(s.durationSeconds % 60).padStart(2, '0')}
                    </Text>
                    <Text style={styles.sessionDate}>{new Date(s.recordedAt).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <Text style={[styles.sessionScore, { color: scoreColor }]}>{Math.round(s.fluencyScore)}</Text>
                </View>
              )
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  avgCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  avgLabel: { fontSize: 13, color: Colors.textMuted },
  avgScore: { fontSize: 48, fontWeight: '900' },
  avgSub: { fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  sessionLeft: { gap: 3 },
  sessionType: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sessionMeta: { fontSize: 13, color: Colors.textSecondary },
  sessionDate: { fontSize: 12, color: Colors.textMuted },
  sessionScore: { fontSize: 28, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  emptyLink: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
})
