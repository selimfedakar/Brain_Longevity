import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../../constants/colors'

interface SessionResult {
  fluencyScore: number
  wordCount: number
  uniqueWordCount: number
  uniqueWordRatio: number
  speechRateWpm: number
  grammarComplexity: number
  coherenceScore: number
  transcript: string | null
  nlpFeatures: {
    sentenceCount: number
    avgSentenceLength: number
    contentWordRatio: number
    wpmScore: number
  }
}

interface MetricRowProps {
  label: string
  value: string
  score: number
  description: string
}

function MetricRow({ label, value, score, description }: MetricRowProps) {
  const color = score >= 70 ? Colors.success : score >= 45 ? Colors.warning : Colors.error
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricScore, { color }]}>{score}/100</Text>
      </View>
      <View style={styles.metricBarTrack}>
        <View style={[styles.metricBarFill, { width: `${score}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.metricFooter}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricDesc}>{description}</Text>
      </View>
    </View>
  )
}

export default function VoiceResultScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const result: SessionResult = data ? JSON.parse(data) : null

  if (!result) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Sonuç bulunamadı.</Text>
      </SafeAreaView>
    )
  }

  const scoreColor = result.fluencyScore >= 70 ? Colors.success
    : result.fluencyScore >= 45 ? Colors.warning
    : Colors.error

  const scoreLabel = result.fluencyScore >= 70 ? 'Güçlü Akıcılık'
    : result.fluencyScore >= 45 ? 'Gelişiyor'
    : 'Pratik Yapın'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Analiz Sonucu</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Ana skor */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Zihinsel Akıcılık Skoru</Text>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{result.fluencyScore}</Text>
          <Text style={[styles.scoreTag, { color: scoreColor }]}>{scoreLabel}</Text>
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, {
              width: `${result.fluencyScore}%` as `${number}%`,
              backgroundColor: scoreColor,
            }]} />
          </View>
          <Text style={styles.scoreHint}>
            {result.fluencyScore >= 70
              ? 'Kelime çeşitliliğiniz ve konuşma akıcılığınız güçlü.'
              : result.fluencyScore >= 45
              ? 'İyi ilerleme — düzenli pratik ile artacak.'
              : 'Günlük sesli konuşma egzersizleri öneririz.'}
          </Text>
        </View>

        {/* Özet istatistikler */}
        <View style={styles.statsRow}>
          {[
            { label: 'Kelime', value: String(result.wordCount) },
            { label: 'Süre', value: `${Math.round(result.speechRateWpm)} kpm` },
            { label: 'Benzersiz', value: `%${Math.round(result.uniqueWordRatio * 100)}` },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Detaylı metrikler */}
        <Text style={styles.sectionTitle}>Detaylı Analiz</Text>

        <MetricRow
          label="Kelime Zenginliği"
          value={`${result.uniqueWordCount} benzersiz / ${result.wordCount} toplam`}
          score={Math.round(result.uniqueWordRatio * 100 * 1.3)}
          description="Kullandığınız kelime çeşitliliği"
        />
        <MetricRow
          label="Konuşma Hızı"
          value={`${result.speechRateWpm} kelime/dk`}
          score={result.nlpFeatures.wpmScore}
          description="İdeal: 120-160 kelime/dakika"
        />
        <MetricRow
          label="Dil Karmaşıklığı"
          value={`Ort. ${result.nlpFeatures.avgSentenceLength.toFixed(1)} kelime/cümle`}
          score={result.grammarComplexity}
          description="Cümle yapısı ve içerik yoğunluğu"
        />
        <MetricRow
          label="Tutarlılık"
          value={`%${Math.round(result.nlpFeatures.contentWordRatio * 100)} içerik kelimesi`}
          score={result.coherenceScore}
          description="Konu bütünlüğü ve sözcük ilişkisi"
        />

        {/* Transkript */}
        {result.transcript && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptTitle}>Transkript</Text>
            <Text style={styles.transcriptText}>{result.transcript}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/voice')}>
          <Text style={styles.doneBtnText}>Yeni Kayıt Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  error: { padding: 20, color: Colors.error },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  scoreLabel: { fontSize: 13, color: Colors.textMuted },
  scoreValue: { fontSize: 56, fontWeight: '900' },
  scoreTag: { fontSize: 15, fontWeight: '700' },
  scoreBarTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  metricRow: { marginBottom: 16, gap: 6 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  metricScore: { fontSize: 14, fontWeight: '700' },
  metricBarTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  metricBarFill: { height: 6, borderRadius: 3 },
  metricFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  metricValue: { fontSize: 12, color: Colors.textSecondary },
  metricDesc: { fontSize: 12, color: Colors.textMuted },
  transcriptBox: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginTop: 8, marginBottom: 16, gap: 8,
  },
  transcriptTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  transcriptText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  doneBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
})
