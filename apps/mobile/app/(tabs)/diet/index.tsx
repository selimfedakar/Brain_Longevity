import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useApi } from '../../../hooks/useApi'
import { Colors } from '../../../constants/colors'
import { useAuthStore } from '../../../store/auth'
import { guestLogDiet, guestGetDietToday } from '../../../store/guestStore'
import { GuestBanner } from '../../../components/GuestBanner'
import { useHealthKit } from '../../../hooks/useHealthKit'

type FoodCategory =
  | 'leafy_greens' | 'other_vegetables' | 'nuts' | 'berries'
  | 'beans' | 'whole_grains' | 'fish' | 'poultry' | 'olive_oil' | 'wine'
  | 'red_meat' | 'butter_margarine' | 'cheese' | 'pastries_sweets' | 'fried_fast_food'

interface CategoryDef {
  key: FoodCategory
  label: string
  emoji: string
  isNegative: boolean
  defaultServings: number
}

const POSITIVE_CATEGORIES: CategoryDef[] = [
  { key: 'leafy_greens',     label: 'Yeşil Yapraklılar', emoji: '🥬', isNegative: false, defaultServings: 1 },
  { key: 'other_vegetables', label: 'Diğer Sebzeler',    emoji: '🥦', isNegative: false, defaultServings: 1 },
  { key: 'nuts',             label: 'Kuruyemiş',          emoji: '🥜', isNegative: false, defaultServings: 1 },
  { key: 'berries',          label: 'Meyveler (Berries)', emoji: '🫐', isNegative: false, defaultServings: 1 },
  { key: 'beans',            label: 'Baklagiller',        emoji: '🫘', isNegative: false, defaultServings: 1 },
  { key: 'whole_grains',     label: 'Tam Tahıl',          emoji: '🌾', isNegative: false, defaultServings: 1 },
  { key: 'fish',             label: 'Balık',              emoji: '🐟', isNegative: false, defaultServings: 1 },
  { key: 'poultry',          label: 'Beyaz Et',           emoji: '🍗', isNegative: false, defaultServings: 1 },
  { key: 'olive_oil',        label: 'Zeytinyağı',         emoji: '🫒', isNegative: false, defaultServings: 1 },
  { key: 'wine',             label: 'Şarap (≤1)',         emoji: '🍷', isNegative: false, defaultServings: 1 },
]

const NEGATIVE_CATEGORIES: CategoryDef[] = [
  { key: 'red_meat',         label: 'Kırmızı Et',        emoji: '🥩', isNegative: true, defaultServings: 1 },
  { key: 'butter_margarine', label: 'Tereyağı/Margarin',  emoji: '🧈', isNegative: true, defaultServings: 1 },
  { key: 'cheese',           label: 'Peynir',             emoji: '🧀', isNegative: true, defaultServings: 1 },
  { key: 'pastries_sweets',  label: 'Hamur İşi/Tatlı',   emoji: '🍰', isNegative: true, defaultServings: 1 },
  { key: 'fried_fast_food',  label: 'Kızartma/Fast Food', emoji: '🍟', isNegative: true, defaultServings: 1 },
]

export default function DietScreen() {
  const { get, post } = useApi()
  const { isGuest } = useAuthStore()
  const today = new Date().toISOString().slice(0, 10)

  const { isAvailable, authorized, syncing, lastSyncAt, requestPermissions, syncToday } = useHealthKit()

  const [checked, setChecked] = useState<Set<FoodCategory>>(new Set())
  const [mindScore, setMindScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchToday = useCallback(async () => {
    try {
      if (isGuest) {
        const log = await guestGetDietToday(today)
        if (log) {
          setChecked(new Set(log.entries.map(e => e.foodCategory as FoodCategory)))
          setMindScore(log.mindScore)
        }
      } else {
        const data = await get<{
          entries: { foodCategory: FoodCategory }[]
          mindScore: number | null
        }>(`/diet/today?date=${today}`)
        setChecked(new Set(data.entries.map(e => e.foodCategory)))
        setMindScore(data.mindScore)
      }
    } catch {
      // ilk kullanım — boş başla
    } finally {
      setLoading(false)
    }
  }, [today, isGuest])

  useEffect(() => { fetchToday() }, [fetchToday])

  const toggle = (key: FoodCategory) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleHealthConnect() {
    const ok = await requestPermissions()
    if (!ok) {
      Alert.alert('Apple Health', 'Ayarlar > Gizlilik > Sağlık bölümünden BrainLongevity\'e izin verin.')
    } else {
      await syncToday()
    }
  }

  const save = async () => {
    if (checked.size === 0) {
      Alert.alert('Boş kayıt', 'En az bir kategori seçin.')
      return
    }
    setSaving(true)
    try {
      const all = [...POSITIVE_CATEGORIES, ...NEGATIVE_CATEGORIES]
      const entries = all
        .filter(c => checked.has(c.key))
        .map(c => ({ foodCategory: c.key, servings: c.defaultServings }))

      let score: number
      if (isGuest) {
        score = await guestLogDiet(today, entries)
      } else {
        const result = await post<{ mindScore: number }>('/diet/log', { date: today, entries })
        score = result.mindScore
      }
      setMindScore(score)
      Alert.alert('Kaydedildi', `Bugünkü MIND skoru: ${score}/15`)
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Bilinmeyen hata')
    } finally {
      setSaving(false)
    }
  }

  const scoreColor = mindScore === null
    ? Colors.textMuted
    : mindScore >= 10 ? Colors.success
    : mindScore >= 6  ? Colors.warning
    : Colors.error

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
        <GuestBanner />
        {isAvailable && (
          <TouchableOpacity
            style={styles.healthBanner}
            onPress={authorized ? syncToday : handleHealthConnect}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <View style={[styles.healthDot, { backgroundColor: authorized ? '#10B981' : '#94A3B8' }]} />
            <Text style={styles.healthBannerText}>
              {authorized
                ? (lastSyncAt
                    ? `Apple Health · ${new Date(lastSyncAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} sync`
                    : 'Apple Health bağlı — Sync için dokun')
                : 'Apple Health\'i bağla'}
            </Text>
            <Text style={styles.healthBannerAction}>{syncing ? '...' : authorized ? '↻' : '→'}</Text>
          </TouchableOpacity>
        )}
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MIND Diyet</Text>
            <Text style={styles.subtitle}>Bugün ne yediniz?</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/diet/weekly')}>
            <Ionicons name="bar-chart-outline" size={24} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Skor kartı */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>MIND Skoru</Text>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {mindScore !== null ? `${mindScore}/15` : '—'}
          </Text>
          <Text style={styles.scoreHint}>
            {mindScore === null ? 'Henüz kaydedilmedi'
              : mindScore >= 10 ? 'Mükemmel beyin diyeti!'
              : mindScore >= 6  ? 'İyi gidiyorsunuz, devam!'
              : 'Daha fazla yeşil & baklagil ekleyin'}
          </Text>
        </View>

        {/* Pozitif kategoriler */}
        <Text style={styles.sectionTitle}>Beyin Dostu Gıdalar</Text>
        <Text style={styles.sectionNote}>Bugün tükettiklerinizi işaretleyin</Text>
        <View style={styles.grid}>
          {POSITIVE_CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.key}
              cat={cat}
              checked={checked.has(cat.key)}
              onToggle={() => toggle(cat.key)}
            />
          ))}
        </View>

        {/* Negatif kategoriler */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Kaçınılacaklar</Text>
        <Text style={styles.sectionNote}>Bugün tükettiniz mi?</Text>
        <View style={styles.grid}>
          {NEGATIVE_CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.key}
              cat={cat}
              checked={checked.has(cat.key)}
              onToggle={() => toggle(cat.key)}
            />
          ))}
        </View>

        {/* Kaydet */}
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Kaydet</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function CategoryChip({
  cat, checked, onToggle,
}: { cat: CategoryDef; checked: boolean; onToggle: () => void }) {
  const bg = checked
    ? cat.isNegative ? '#FEE2E2' : '#D1FAE5'
    : Colors.surface
  const border = checked
    ? cat.isNegative ? Colors.error : Colors.success
    : Colors.border

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.chipEmoji}>{cat.emoji}</Text>
      <Text style={styles.chipLabel} numberOfLines={2}>{cat.label}</Text>
      {checked && (
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={cat.isNegative ? Colors.error : Colors.success}
          style={styles.chipCheck}
        />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 28, borderWidth: 1, borderColor: Colors.border,
  },
  scoreLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  scoreValue: { fontSize: 42, fontWeight: '800' },
  scoreHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionNote: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    width: '30%', borderRadius: 12, borderWidth: 1.5,
    padding: 10, alignItems: 'center', position: 'relative',
  },
  chipEmoji: { fontSize: 24, marginBottom: 4 },
  chipLabel: { fontSize: 11, textAlign: 'center', color: Colors.text, lineHeight: 14 },
  chipCheck: { position: 'absolute', top: 6, right: 6 },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  healthBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthBannerText: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  healthBannerAction: { fontSize: 14, fontWeight: '700', color: Colors.accent },
})
