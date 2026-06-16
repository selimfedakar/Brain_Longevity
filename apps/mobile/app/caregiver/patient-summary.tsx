import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'

type BHIRow = { date: string; composite_index: number }
type Summary = {
  patient: { display_name: string; last_active: string }
  bhi: BHIRow[]
  cognitive: { date: string; overall_score: number; sessions_completed: number }[]
  diet: { date: string; mind_score: number }[]
  fluency: { date: string; score: number; trend_7d: number }[]
}

function ScoreCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.scoreCard}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  )
}

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend >= 0
  return (
    <View style={[styles.trendBadge, { backgroundColor: positive ? '#ECFDF5' : '#FEF2F2' }]}>
      <Ionicons
        name={positive ? 'trending-up' : 'trending-down'}
        size={14}
        color={positive ? Colors.success : Colors.error}
      />
      <Text style={[styles.trendText, { color: positive ? Colors.success : Colors.error }]}>
        {positive ? '+' : ''}{trend?.toFixed(1) ?? '—'}
      </Text>
    </View>
  )
}

export default function PatientSummaryScreen() {
  const { patientId, name } = useLocalSearchParams<{ patientId: string; name: string }>()
  const { get } = useApi()
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<Summary>(`/caregiver/patient/${patientId}/summary`)
      .then(setData)
      .catch((e: any) => Alert.alert('Hata', e.message))
      .finally(() => setLoading(false))
  }, [patientId])

  const latestBHI = data?.bhi[0]?.composite_index
  const latestCognitive = data?.cognitive[0]?.overall_score
  const latestDiet = data?.diet[0]?.mind_score
  const latestFluency = data?.fluency[0]?.score
  const fluencyTrend = data?.fluency[0]?.trend_7d ?? 0

  const lastActive = data?.patient.last_active
    ? new Date(data.patient.last_active).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
    : '—'

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: name ?? 'Hasta Özeti' }} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Son aktif */}
        <View style={styles.lastActiveRow}>
          <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.lastActiveText}>Son aktif: {lastActive}</Text>
        </View>

        {/* BHI Kartı */}
        <View style={styles.bhiCard}>
          <Text style={styles.bhiLabel}>Beyin Sağlığı Endeksi</Text>
          <Text style={styles.bhiValue}>{latestBHI?.toFixed(0) ?? '—'}</Text>
          <Text style={styles.bhiSub}>/ 100</Text>
          {data && data.bhi.length > 1 && (
            <TrendBadge trend={
              (data.bhi[0]?.composite_index ?? 0) - (data.bhi[1]?.composite_index ?? 0)
            } />
          )}
        </View>

        {/* Metrik kartları */}
        <View style={styles.scoreGrid}>
          <ScoreCard
            label="Kognitif"
            value={latestCognitive?.toFixed(0) ?? '—'}
            icon="fitness-outline"
            color="#6C63FF"
          />
          <ScoreCard
            label="MIND Diyet"
            value={latestDiet != null ? `${latestDiet.toFixed(1)}/15` : '—'}
            icon="leaf-outline"
            color={Colors.success}
          />
          <ScoreCard
            label="Akıcılık"
            value={latestFluency?.toFixed(0) ?? '—'}
            icon="mic-outline"
            color={Colors.accent}
          />
        </View>

        {/* Konuşma akıcılığı trendi */}
        {data && data.fluency.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Konuşma Akıcılığı (7 gün)</Text>
              <TrendBadge trend={fluencyTrend} />
            </View>
            {data.fluency.map((f) => (
              <View key={f.date} style={styles.rowItem}>
                <Text style={styles.rowDate}>
                  {new Date(f.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </Text>
                <View style={styles.rowBar}>
                  <View style={[styles.rowBarFill, { width: `${Math.min(f.score, 100)}%`, backgroundColor: Colors.accent }]} />
                </View>
                <Text style={styles.rowScore}>{f.score?.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Kognitif seanslar */}
        {data && data.cognitive.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kognitif Antrenman (7 gün)</Text>
            {data.cognitive.map((c) => (
              <View key={c.date} style={styles.rowItem}>
                <Text style={styles.rowDate}>
                  {new Date(c.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.rowMeta}>{c.sessions_completed} seans</Text>
                <Text style={styles.rowScore}>{c.overall_score?.toFixed(0) ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Uyarı kutusu */}
        <View style={styles.alertBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.alertText}>
            Detaylı veri ve günlük notlar gizlilik nedeniyle gösterilmemektedir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 16 },
  lastActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastActiveText: { fontSize: 13, color: Colors.textMuted },
  bhiCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', gap: 4 },
  bhiLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  bhiValue: { fontSize: 64, fontWeight: '800', color: Colors.white, lineHeight: 72 },
  bhiSub: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  trendText: { fontSize: 13, fontWeight: '600' },
  scoreGrid: { flexDirection: 'row', gap: 10 },
  scoreCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  scoreValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
  scoreLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  section: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, gap: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowDate: { width: 60, fontSize: 13, color: Colors.textSecondary },
  rowBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  rowBarFill: { height: '100%', borderRadius: 3 },
  rowMeta: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  rowScore: { width: 32, fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  alertBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertText: { flex: 1, fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
})
