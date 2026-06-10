import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated'
import { useEffect, useState } from 'react'
import { Colors } from '../../../constants/colors'
import { useApi } from '../../../hooks/useApi'
import { useHealthKit } from '../../../hooks/useHealthKit'

interface HealthScores {
  date: string
  sleep: number
  exercise: number
}

interface BHIData {
  date: string
  composite: number
  breakdown: {
    cognitive_score: number
    sleep_score: number
    exercise_score: number
    diet_score: number
    fluency_score: number
    composite_index: number
  } | null
}

const METRIC_CONFIG = [
  { key: 'sleep_score',    label: 'Uyku',     emoji: '🌙', color: '#818CF8', weight: '25%' },
  { key: 'exercise_score', label: 'Egzersiz', emoji: '🏃', color: '#10B981', weight: '20%' },
  { key: 'cognitive_score',label: 'Kognitif', emoji: '🧠', color: '#4ECDC4', weight: '30%' },
  { key: 'diet_score',     label: 'Diyet',    emoji: '🥦', color: '#F59E0B', weight: '15%' },
  { key: 'fluency_score',  label: 'Akıcılık', emoji: '🗣️', color: '#EF4444', weight: '10%' },
] as const

function AnimatedBar({ score, color }: { score: number; color: string }) {
  const width = useSharedValue(0)
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as unknown as number, backgroundColor: color }))

  useEffect(() => {
    width.value = withTiming(score, { duration: 800 })
  }, [score])

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, barStyle]} />
    </View>
  )
}

const barStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 4 },
})

export default function HealthScreen() {
  const { get, post } = useApi()
  const { isAvailable, authorized, syncing, lastSyncAt, requestPermissions, syncToday } = useHealthKit()
  const [sleepHours, setSleepHours] = useState(7.5)
  const [sleepQuality, setSleepQuality] = useState<number>(3)
  const [savingSleep, setSavingSleep] = useState(false)
  const [lastManualSleepAt, setLastManualSleepAt] = useState<string | null>(null)

  // Quality → deep%, rem%, efficiency mapping (evidence-based estimates)
  const QUALITY_MAP = [
    { label: 'Çok Kötü', color: '#EF4444', deep: 0.10, rem: 0.12, efficiency: 45 },
    { label: 'Kötü',     color: '#F97316', deep: 0.14, rem: 0.18, efficiency: 60 },
    { label: 'Orta',     color: '#F59E0B', deep: 0.18, rem: 0.22, efficiency: 75 },
    { label: 'İyi',      color: '#10B981', deep: 0.22, rem: 0.25, efficiency: 85 },
    { label: 'Mükemmel', color: '#6C63FF', deep: 0.25, rem: 0.28, efficiency: 95 },
  ]

  const { data: bhi, refetch } = useQuery<BHIData>({
    queryKey: ['bhi-today'],
    queryFn: () => get<BHIData>('/health/bhi'),
    retry: false,
  })

  const bhiScore = bhi?.breakdown?.composite_index ?? 0
  const bhiScale = useSharedValue(0.8)
  const bhiBgStyle = useAnimatedStyle(() => ({ transform: [{ scale: bhiScale.value }] }))

  useEffect(() => {
    bhiScale.value = withSpring(1, { damping: 12 })
  }, [bhiScore])

  async function handleConnect() {
    const ok = await requestPermissions()
    if (ok) {
      await syncToday()
      refetch()
    } else {
      Alert.alert(
        'Apple Health',
        'Ayarlar > Gizlilik > Sağlık > BrainLongevity bölümünden izin verebilirsiniz.'
      )
    }
  }

  async function handleSync() {
    await syncToday()
    refetch()
  }

  async function handleSaveManualSleep() {
    setSavingSleep(true)
    try {
      const q = QUALITY_MAP[sleepQuality - 1]
      const totalMin = Math.round(sleepHours * 60)
      const deepMin = Math.round(totalMin * q.deep)
      const remMin = Math.round(totalMin * q.rem)
      const recordedAt = new Date().toISOString()
      await post('/health/ingest/batch', {
        metrics: [
          { metricType: 'total_sleep_min',  value: totalMin,     source: 'manual', recordedAt },
          { metricType: 'deep_sleep_min',   value: deepMin,      source: 'manual', recordedAt },
          { metricType: 'rem_sleep_min',    value: remMin,       source: 'manual', recordedAt },
          { metricType: 'sleep_efficiency', value: q.efficiency, source: 'manual', recordedAt },
        ],
      })
      setLastManualSleepAt(recordedAt)
      refetch()
      Alert.alert('Kaydedildi', `${sleepHours} saatlik uyku verisi işlendi.`)
    } catch {
      Alert.alert('Hata', 'Uyku verisi kaydedilemedi, tekrar deneyin.')
    } finally {
      setSavingSleep(false)
    }
  }

  const breakdown = bhi?.breakdown

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.pageHeader}>
          <Text style={styles.title}>Sağlık Verileri</Text>
          <Text style={styles.subtitle}>Apple Health entegrasyonu</Text>
        </View>

        {/* BHI Kart */}
        <Animated.View style={[styles.bhiCard, bhiBgStyle]}>
          <Text style={styles.bhiLabel}>Beyin Sağlığı Endeksi</Text>
          <Text style={[styles.bhiScore, { color: bhiScore >= 70 ? '#10B981' : bhiScore >= 50 ? '#F59E0B' : '#EF4444' }]}>
            {bhiScore}
          </Text>
          <Text style={styles.bhiOf}>/ 100</Text>
        </Animated.View>

        {/* Domain Breakdown */}
        {breakdown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alan Detayları</Text>
            {METRIC_CONFIG.map(({ key, label, emoji, color, weight }) => {
              const score = Math.round(breakdown[key as keyof typeof breakdown] as number ?? 0)
              return (
                <View key={key} style={styles.metricRow}>
                  <Text style={styles.metricEmoji}>{emoji}</Text>
                  <View style={styles.metricInfo}>
                    <View style={styles.metricHeader}>
                      <Text style={styles.metricLabel}>{label}</Text>
                      <Text style={[styles.metricScore, { color }]}>{score}</Text>
                    </View>
                    <AnimatedBar score={score} color={color} />
                    <Text style={styles.metricWeight}>{weight} ağırlık</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Apple Health Bağlantı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apple Health</Text>

          {!isAvailable ? (
            <View style={styles.unavailableCard}>
              <Text style={styles.unavailableText}>
                Apple Health yalnızca iOS'ta kullanılabilir.
              </Text>
            </View>
          ) : (
            <View style={styles.healthCard}>
              <View style={styles.healthStatus}>
                <View style={[styles.statusDot, { backgroundColor: authorized ? '#10B981' : '#9CA3AF' }]} />
                <Text style={styles.statusText}>
                  {authorized ? 'Bağlı' : 'Bağlantı yok'}
                </Text>
                {lastSyncAt && (
                  <Text style={styles.lastSync}>
                    Son sync: {new Date(lastSyncAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>

              {!authorized ? (
                <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                  <Text style={styles.connectButtonText}>Apple Health'i Bağla</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                  onPress={handleSync}
                  disabled={syncing}
                >
                  <Text style={styles.syncButtonText}>
                    {syncing ? 'Senkronize ediliyor...' : '↻ Şimdi Senkronize Et'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.permissionList}>
                <Text style={styles.permissionTitle}>Okunan veriler:</Text>
                {['Uyku analizi', 'Adım sayısı', 'Aktif dakika', 'HRV', 'Dinlenme nabzı'].map((p) => (
                  <Text key={p} style={styles.permissionItem}>• {p}</Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Manuel Giriş */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manuel Giriş</Text>

          {!authorized && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Apple Watch veya uyumlu cihazınız yoksa uyku verinizi aşağıdan manuel girebilirsiniz. Otomatik takip için yukarıdan Apple Health'i bağlayın.
              </Text>
            </View>
          )}

          <View style={styles.manualCard}>
            <Text style={styles.manualCardTitle}>Dün gece kaç saat uyudunuz?</Text>
            <View style={styles.sleepPicker}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setSleepHours(h => Math.max(1, Math.round((h - 0.5) * 10) / 10))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sleepValueBox}>
                <Text style={styles.sleepValue}>{sleepHours}</Text>
                <Text style={styles.sleepUnit}>saat</Text>
              </View>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setSleepHours(h => Math.min(12, Math.round((h + 0.5) * 10) / 10))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qualitySection}>
              <Text style={styles.qualityLabel}>Uyku kaliteniz nasıldı?</Text>
              <View style={styles.qualityRow}>
                {QUALITY_MAP.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.qualityBtn, sleepQuality === i + 1 && { backgroundColor: q.color, borderColor: q.color }]}
                    onPress={() => setSleepQuality(i + 1)}
                  >
                    <Text style={[styles.qualityBtnText, sleepQuality === i + 1 && styles.qualityBtnTextActive]}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(() => {
              const q = QUALITY_MAP[sleepQuality - 1]
              const total = Math.round(sleepHours * 60)
              return (
                <View style={styles.sleepEstimates}>
                  <Text style={styles.estimateLabel}>Derin uyku: <Text style={[styles.estimateValue, { color: q.color }]}>{Math.round(total * q.deep)} dk</Text></Text>
                  <Text style={styles.estimateLabel}>REM: <Text style={[styles.estimateValue, { color: q.color }]}>{Math.round(total * q.rem)} dk</Text></Text>
                  <Text style={styles.estimateLabel}>Verimlilik: <Text style={[styles.estimateValue, { color: q.color }]}>%{q.efficiency}</Text></Text>
                </View>
              )
            })()}

            <TouchableOpacity
              style={[styles.saveButton, savingSleep && styles.saveButtonDisabled]}
              onPress={handleSaveManualSleep}
              disabled={savingSleep}
            >
              <Text style={styles.saveButtonText}>
                {savingSleep ? 'Kaydediliyor...' : '💾 Uyku Verisini Kaydet'}
              </Text>
            </TouchableOpacity>

            {lastManualSleepAt && (
              <Text style={styles.lastSaved}>
                Son kayıt: {new Date(lastManualSleepAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, gap: 24 },
  pageHeader: { gap: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  bhiCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20, padding: 28, alignItems: 'center', gap: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  bhiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  bhiScore: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  bhiOf: { fontSize: 18, color: 'rgba(255,255,255,0.5)' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  metricEmoji: { fontSize: 22, marginTop: 2 },
  metricInfo: { flex: 1, gap: 4 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  metricScore: { fontSize: 17, fontWeight: '800' },
  metricWeight: { fontSize: 11, color: Colors.textMuted },
  unavailableCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  unavailableText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  healthCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  healthStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  lastSync: { fontSize: 12, color: Colors.textMuted, marginLeft: 'auto' },
  connectButton: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  connectButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  syncButton: { backgroundColor: Colors.surface, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.accent },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  permissionList: { gap: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  permissionTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  permissionItem: { fontSize: 12, color: Colors.textSecondary },
  infoCard: { flexDirection: 'row', backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: '#C7D2FE' },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#4338CA', lineHeight: 19 },
  manualCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 16 },
  manualCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sleepPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 24, fontWeight: '600', color: Colors.white, lineHeight: 28 },
  sleepValueBox: { alignItems: 'center', minWidth: 80 },
  sleepValue: { fontSize: 42, fontWeight: '900', color: Colors.primary, lineHeight: 48 },
  sleepUnit: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  qualitySection: { gap: 8 },
  qualityLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  qualityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  qualityBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  qualityBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  qualityBtnTextActive: { color: '#fff' },
  sleepEstimates: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12 },
  estimateLabel: { fontSize: 12, color: Colors.textMuted },
  estimateValue: { color: Colors.text, fontWeight: '700' },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  lastSaved: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
})
