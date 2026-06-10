import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, FadeInDown, withDelay,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { Colors } from '../../../constants/colors'
import { useAuthStore } from '../../../store/auth'
import { guestGetWeeklyReport } from '../../../store/guestStore'

interface WeeklyReport {
  weekStart: string
  weekEnd: string
  mindScore: number
  maxScore: number
  categoryTotals: Record<string, number>
  dailyScores: { date: string; score: number }[]
}

const CATEGORY_META: Record<string, {
  label: string; emoji: string; isNegative: boolean; weeklyTarget: number
}> = {
  leafy_greens:     { label: 'Yeşil Yapraklılar', emoji: '🥬', isNegative: false, weeklyTarget: 6 },
  other_vegetables: { label: 'Diğer Sebzeler',    emoji: '🥦', isNegative: false, weeklyTarget: 7 },
  nuts:             { label: 'Kuruyemiş',          emoji: '🥜', isNegative: false, weeklyTarget: 5 },
  berries:          { label: 'Meyveler',           emoji: '🫐', isNegative: false, weeklyTarget: 2 },
  beans:            { label: 'Baklagiller',        emoji: '🫘', isNegative: false, weeklyTarget: 4 },
  whole_grains:     { label: 'Tam Tahıl',          emoji: '🌾', isNegative: false, weeklyTarget: 21 },
  fish:             { label: 'Balık',              emoji: '🐟', isNegative: false, weeklyTarget: 1 },
  poultry:          { label: 'Beyaz Et',           emoji: '🍗', isNegative: false, weeklyTarget: 2 },
  olive_oil:        { label: 'Zeytinyağı',         emoji: '🫒', isNegative: false, weeklyTarget: 7 },
  wine:             { label: 'Şarap',              emoji: '🍷', isNegative: false, weeklyTarget: 7 },
  red_meat:         { label: 'Kırmızı Et',         emoji: '🥩', isNegative: true,  weeklyTarget: 4 },
  butter_margarine: { label: 'Tereyağı/Margarin',  emoji: '🧈', isNegative: true,  weeklyTarget: 7 },
  cheese:           { label: 'Peynir',             emoji: '🧀', isNegative: true,  weeklyTarget: 7 },
  pastries_sweets:  { label: 'Hamur İşi/Tatlı',   emoji: '🍰', isNegative: true,  weeklyTarget: 5 },
  fried_fast_food:  { label: 'Kızartma/Fast Food', emoji: '🍟', isNegative: true,  weeklyTarget: 1 },
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function ScoreRing({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const scale = useSharedValue(0.6)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withTiming(1, { duration: 600 })
    opacity.value = withTiming(1, { duration: 500 })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const pct = Math.min(score / maxScore, 1)
  const ringSize = 160
  const ringThickness = 12

  return (
    <Animated.View style={[styles.ringWrapper, animStyle]}>
      <View style={[
        styles.ringOuter,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: ringThickness,
          borderColor: Colors.border,
        },
      ]}>
        <View style={[
          styles.ringProgress,
          {
            width: ringSize - ringThickness * 2,
            height: ringSize - ringThickness * 2,
            borderRadius: (ringSize - ringThickness * 2) / 2,
            borderWidth: ringThickness,
            borderColor: color,
            opacity: pct,
          },
        ]} />
        <View style={styles.ringCenter}>
          <Text style={[styles.ringScore, { color }]}>{score}</Text>
          <Text style={styles.ringMax}>/ {maxScore}</Text>
          <Text style={styles.ringLabel}>MIND</Text>
        </View>
      </View>
    </Animated.View>
  )
}

function AnimatedBar({
  score, maxScore, index, isActive,
}: { score: number; maxScore: number; index: number; isActive: boolean }) {
  const height = useSharedValue(0)
  const barColor = score >= 10 ? Colors.success : score >= 6 ? Colors.warning : Colors.error
  const activeColor = isActive ? Colors.accent : barColor

  useEffect(() => {
    height.value = withDelay(index * 60, withTiming(score / maxScore, { duration: 500 }))
  }, [score, maxScore, index])

  const animStyle = useAnimatedStyle(() => ({
    flex: height.value,
  }))

  return (
    <Animated.View
      style={styles.barCol}
      entering={FadeInDown.delay(index * 60).duration(400)}
    >
      <Text style={styles.barValue}>{score > 0 ? score : ''}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, { backgroundColor: activeColor }, animStyle]}
        />
      </View>
      <Text style={[styles.barDay, isActive && { color: Colors.accent, fontWeight: '700' }]}>
        {DAY_LABELS[index] ?? ''}
      </Text>
    </Animated.View>
  )
}

function CategoryProgressRow({ cat, total }: { cat: string; total: number }) {
  const meta = CATEGORY_META[cat]
  if (!meta) return null

  const isNeg = meta.isNegative
  const progressColor = isNeg ? Colors.error : Colors.success
  const pct = Math.min(total / meta.weeklyTarget, 1)
  const displayPct = isNeg ? Math.max(0, 1 - pct) : pct

  const width = useSharedValue(0)
  useEffect(() => {
    width.value = withTiming(displayPct, { duration: 600 })
  }, [displayPct])

  const animBarStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as `${number}%`,
  }))

  return (
    <View style={styles.catRow}>
      <Text style={styles.catEmoji}>{meta.emoji}</Text>
      <View style={styles.catInfo}>
        <View style={styles.catTopRow}>
          <Text style={styles.catLabel}>{meta.label}</Text>
          <Text style={[styles.catTotal, { color: isNeg ? Colors.error : Colors.success }]}>
            {total} porsiyon
          </Text>
        </View>
        <View style={styles.catBarTrack}>
          <Animated.View style={[styles.catBarFill, { backgroundColor: progressColor }, animBarStyle]} />
        </View>
      </View>
    </View>
  )
}

export default function WeeklyDietScreen() {
  const { get } = useApi()
  const { isGuest } = useAuthStore()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = isGuest
      ? guestGetWeeklyReport()
      : get<WeeklyReport>('/diet/weekly-report')
    load
      .then(data => setReport(data as WeeklyReport))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isGuest])

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </SafeAreaView>
    )
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>Bu hafta henüz kayıt yok.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Bugünkü diyet sayfasına dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const scoreColor = report.mindScore >= 10 ? Colors.success
    : report.mindScore >= 6 ? Colors.warning
    : Colors.error

  const maxDaily = Math.max(...report.dailyScores.map(d => d.score), 1)
  const maxDailyIndex = report.dailyScores.reduce(
    (best, d, i) => (d.score > (report.dailyScores[best]?.score ?? 0) ? i : best),
    0,
  )

  const allCategories = Object.keys(CATEGORY_META)
  const completedCount = allCategories.filter(cat => {
    const meta = CATEGORY_META[cat]
    const total = report.categoryTotals[cat] ?? 0
    if (!meta) return false
    return meta.isNegative ? total === 0 : total >= meta.weeklyTarget
  }).length

  const scoreHint = report.mindScore >= 10
    ? 'Mükemmel! MIND diyetine tam uyum.'
    : report.mindScore >= 6
    ? 'İyi ilerleme — daha fazla yeşil & baklagil ekleyin.'
    : 'Bu hafta diyetinizi iyileştirmeye odaklanın.'

  const positiveCategories = Object.entries(report.categoryTotals).filter(
    ([k]) => !CATEGORY_META[k]?.isNegative,
  )
  const negativeCategories = Object.entries(report.categoryTotals).filter(
    ([k]) => CATEGORY_META[k]?.isNegative,
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Haftalık Rapor</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.dateRange}>
          {formatDate(report.weekStart)} – {formatDate(report.weekEnd)}
        </Text>

        <Animated.View style={styles.chipsRow} entering={FadeInDown.delay(50).duration(400)}>
          <View style={[styles.chip, { backgroundColor: scoreColor + '20', borderColor: scoreColor }]}>
            <Text style={[styles.chipText, { color: scoreColor }]}>
              {completedCount}/{allCategories.length} kategori tamamlandı
            </Text>
          </View>
          {report.mindScore >= 10 ? (
            <View style={[styles.chip, { backgroundColor: Colors.success + '20', borderColor: Colors.success }]}>
              <Text style={[styles.chipText, { color: Colors.success }]}>Bu hafta üstün diyet</Text>
            </View>
          ) : (
            <View style={[styles.chip, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning }]}>
              <Text style={[styles.chipText, { color: Colors.warning }]}>Gelişime açık</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={styles.ringCard} entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.scoreLabel}>Haftalık MIND Skoru</Text>
          <ScoreRing score={report.mindScore} maxScore={report.maxScore} color={scoreColor} />
          <Text style={[styles.scoreHint, { color: scoreColor }]}>{scoreHint}</Text>
        </Animated.View>

        {report.dailyScores.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.sectionTitle}>Günlük Puanlar</Text>
            <View style={styles.barChart}>
              {report.dailyScores.map((d, i) => (
                <AnimatedBar
                  key={d.date}
                  score={d.score}
                  maxScore={maxDaily}
                  index={i}
                  isActive={i === maxDailyIndex && d.score > 0}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {positiveCategories.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInDown.delay(350).duration(400)}>
            <Text style={styles.sectionTitle}>Beyin Dostu Gıdalar</Text>
            {positiveCategories.map(([cat, total]) => (
              <CategoryProgressRow key={cat} cat={cat} total={total} />
            ))}
          </Animated.View>
        )}

        {negativeCategories.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInDown.delay(450).duration(400)}>
            <Text style={styles.sectionTitle}>Tüketilen Kaçınılacaklar</Text>
            {negativeCategories.map(([cat, total]) => (
              <CategoryProgressRow key={cat} cat={cat} total={total} />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 16 },
  scroll: { padding: 20, paddingBottom: 48 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  dateRange: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 16 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  ringCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  scoreLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  scoreHint: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  ringWrapper: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringProgress: {
    position: 'absolute',
  },
  ringCenter: { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  ringScore: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  ringMax: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
  ringLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, color: Colors.textMuted, marginBottom: 3, fontWeight: '600' },
  barTrack: {
    flex: 1, width: '80%', backgroundColor: Colors.border, borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { borderRadius: 6, minHeight: 4 },
  barDay: { fontSize: 10, color: Colors.textMuted, marginTop: 5, fontWeight: '500' },

  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  catInfo: { flex: 1, gap: 6 },
  catTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catLabel: { fontSize: 14, color: Colors.text, fontWeight: '500', flex: 1 },
  catTotal: { fontSize: 13, fontWeight: '700' },
  catBarTrack: {
    height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden',
  },
  catBarFill: { height: 4, borderRadius: 2 },

  emptyText: { fontSize: 16, color: Colors.textMuted },
  backBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: Colors.white, fontWeight: '600' },
})
