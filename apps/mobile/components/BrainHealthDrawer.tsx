import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  useWindowDimensions, Pressable,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
  cancelAnimation,
} from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { useApi } from '../hooks/useApi'

interface Props {
  visible: boolean
  onClose: () => void
}

const DOMAIN_META = [
  { key: 'cognitive_score', label: 'Kognitif', icon: '🧠', color: '#6C63FF' },
  { key: 'sleep_score',     label: 'Uyku',     icon: '😴', color: '#48B2E8' },
  { key: 'exercise_score',  label: 'Egzersiz', icon: '💪', color: '#4CAF50' },
  { key: 'diet_score',      label: 'Diyet',    icon: '🥗', color: '#FF9800' },
  { key: 'fluency_score',   label: 'Akıcılık', icon: '💬', color: '#E91E63' },
] as const

interface BHIBreakdown {
  cognitive_score: number
  sleep_score: number
  exercise_score: number
  diet_score: number
  fluency_score: number
  composite_index: number
}

export function BrainHealthDrawer({ visible, onClose }: Props) {
  const { width } = useWindowDimensions()
  const DRAWER_WIDTH = width * 0.82
  const translateX = useSharedValue(-DRAWER_WIDTH)
  const overlayOpacity = useSharedValue(0)
  const [showModal, setShowModal] = useState(false)
  const isOpenRef = useRef(false)

  const { get } = useApi()
  const { data: bhi } = useQuery<{ breakdown: BHIBreakdown | null }>({
    queryKey: ['bhi-today'],
    queryFn: () => get('/health/bhi'),
    retry: false,
    staleTime: 60_000,
  })

  function closeModal() {
    setShowModal(false)
    isOpenRef.current = false
  }

  function handleShow() {
    // onShow fires after Modal is fully presented on the native layer — safe to animate
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
    overlayOpacity.value = withTiming(1, { duration: 220 })
  }

  useEffect(() => {
    if (visible) {
      cancelAnimation(translateX)
      cancelAnimation(overlayOpacity)
      translateX.value = -DRAWER_WIDTH
      overlayOpacity.value = 0
      isOpenRef.current = true
      setShowModal(true)
    } else if (isOpenRef.current) {
      cancelAnimation(translateX)
      cancelAnimation(overlayOpacity)
      translateX.value = withSpring(-DRAWER_WIDTH, { damping: 20, stiffness: 200 })
      overlayOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        'worklet'
        if (finished) runOnJS(closeModal)()
      })
    }
  }, [visible])

  const drawerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  const breakdown = bhi?.breakdown
  const BHI = breakdown?.composite_index ?? 0
  const hasData = !!breakdown

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      onShow={handleShow}
    >
      {/* Dismiss tap area — behind everything, full screen */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Dark overlay — visual only, does NOT intercept touches */}
      <Animated.View style={[styles.overlay, overlayAnimStyle]} pointerEvents="none" />

      {/* Drawer panel — rendered last so it's on top */}
      <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH }, drawerAnimStyle]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Beyin Sağlığı</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.bhiCard}>
              <Text style={styles.bhiEmoji}>🧠</Text>
              <Text style={styles.bhiLabel}>Beyin Sağlığı Endeksi</Text>
              <Text style={styles.bhiScore}>{hasData ? BHI : '--'}</Text>
              <Text style={styles.bhiSub}>
                {hasData
                  ? `/ 100 • ${BHI >= 70 ? 'İyi' : BHI >= 50 ? 'Orta' : 'Düşük'}`
                  : 'Henüz veri yok'}
              </Text>
              {hasData && (
                <View style={styles.bhiTrack}>
                  <View style={[styles.bhiFill, { width: `${BHI}%` as any }]} />
                </View>
              )}
            </View>

            <Text style={styles.sectionLabel}>ALAN SKORLARI</Text>

            {!hasData ? (
              <Text style={styles.noDataText}>Sağlık sekmesinden Apple Health'i bağlayın veya manuel veri girin.</Text>
            ) : DOMAIN_META.map((d) => {
              const score = Math.round(breakdown![d.key as keyof BHIBreakdown] as number ?? 0)
              return (
                <View key={d.label} style={styles.domainRow}>
                  <Text style={styles.domainIcon}>{d.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.domainHeader}>
                      <Text style={styles.domainLabel}>{d.label}</Text>
                      <Text style={[styles.domainScore, { color: d.color }]}>{score}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${score}%` as any, backgroundColor: d.color }]} />
                    </View>
                  </View>
                </View>
              )
            })}

            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>Bugün 30 dk yürüyüş yaparak egzersiz skorunu artır</Text>
            </View>

            <View style={styles.dataSourceCard}>
              <Text style={styles.dataSourceTitle}>Verilerinizi güncelleyin</Text>
              <View style={styles.dataSourceRow}>
                <View style={styles.dataSourceItem}>
                  <Ionicons name="watch-outline" size={20} color="#6C63FF" />
                  <Text style={styles.dataSourceLabel}>Apple Watch / iPhone Sağlık</Text>
                  <Text style={styles.dataSourceDesc}>Uyku, adım ve nabzınız otomatik aktarılır</Text>
                </View>
              </View>
              <View style={styles.dataSourceDivider} />
              <View style={styles.dataSourceRow}>
                <View style={styles.dataSourceItem}>
                  <Ionicons name="create-outline" size={20} color="#10B981" />
                  <Text style={styles.dataSourceLabel}>Manuel Giriş</Text>
                  <Text style={styles.dataSourceDesc}>Cihazınız yoksa uyku ve egzersiz verinizi kendiniz girin</Text>
                </View>
              </View>
              <Text style={styles.dataSourceHint}>Sağlık sekmesinden bağlayın veya girin →</Text>
            </View>
          </ScrollView>
        </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  content: { padding: 20, gap: 14, paddingBottom: 40 },

  bhiCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  bhiEmoji: { fontSize: 40 },
  bhiLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginTop: 4 },
  bhiScore: { fontSize: 60, fontWeight: '900', color: Colors.primary, lineHeight: 68 },
  bhiSub: { fontSize: 14, color: Colors.textMuted },
  bhiTrack: {
    width: '100%', height: 8, backgroundColor: Colors.border,
    borderRadius: 4, overflow: 'hidden', marginTop: 12,
  },
  bhiFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2,
  },

  domainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  domainIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  domainLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  domainScore: { fontSize: 13, fontWeight: '700' },
  barTrack: { height: 7, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  noDataText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, textAlign: 'center', paddingVertical: 8 },
  dataSourceCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  dataSourceTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  dataSourceRow: {},
  dataSourceItem: { gap: 4 },
  dataSourceLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  dataSourceDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  dataSourceDivider: { height: 1, backgroundColor: Colors.border },
  dataSourceHint: { fontSize: 12, color: Colors.accent, fontWeight: '600', textAlign: 'right' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
})
