import { useState, memo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  Modal, Alert, ActivityIndicator, Linking, useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown, FadeIn } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'
import { useAuthStore } from '../../store/auth'
import { GuestBanner } from '../../components/GuestBanner'
import { BrainHealthDrawer } from '../../components/BrainHealthDrawer'
import { STATIC_ARTICLES } from '../../constants/articles'

interface DomainRating {
  domain: string
  elo_rating: number
  games_played: number
}

interface DashboardData {
  bhi: number
  streak: number
  cognitive: number
  sleep: number
  exercise: number
  diet: number
  fluency: number
}

interface Article {
  id: string
  title: string
  authors: string
  year: number
  journal: string
  doi_link: string | null
  user_summary: string
  academic_abstract: string
}

const DOMAIN_META: Record<string, {
  label: string; emoji: string; description: string; gameId?: string;
  color: string; shadowColor: string;
}> = {
  attention: {
    label: 'Dikkat', emoji: '🎯', description: 'Stroop, Flanker', gameId: 'stroop',
    color: '#FF6B6B', shadowColor: '#FF6B6B',
  },
  working_memory: {
    label: 'Çalışma Belleği', emoji: '🧠', description: 'N-Back, Digit Span', gameId: 'n_back',
    color: '#4A9EFF', shadowColor: '#4A9EFF',
  },
  processing_speed: {
    label: 'İşlem Hızı', emoji: '⚡', description: 'Symbol Match, Trail Making', gameId: 'processing_speed',
    color: '#FFB347', shadowColor: '#FFB347',
  },
  multitasking: {
    label: 'Çoklu Görev', emoji: '🔄', description: 'Dual Task', gameId: 'multitasking',
    color: '#6BCB77', shadowColor: '#6BCB77',
  },
  spatial: {
    label: 'Uzamsal', emoji: '🧩', description: 'Mental Rotation, Spatial Span', gameId: 'spatial',
    color: '#C77DFF', shadowColor: '#C77DFF',
  },
  executive_function: {
    label: 'Yönetici İşlev', emoji: '🏛️', description: 'Trail Making B', gameId: 'trail_making',
    color: '#4ECDC4', shadowColor: '#4ECDC4',
  },
}


function ScienceModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { get } = useApi()
  const { data: article, isLoading } = useQuery<Article>({
    queryKey: ['article-game', gameId],
    queryFn: async () => {
      try { return await get(`/articles/game/${gameId}`) } catch { return null }
    },
    retry: false,
    select: (data) => data ?? STATIC_ARTICLES.find((a: any) => a.game_id === gameId) ?? null,
  })

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Bilimsel Altyapı</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 32, marginBottom: 32 }} />
        ) : article ? (
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalMeta}>
              <Text style={styles.modalArticleTitle}>{article.title}</Text>
              <Text style={styles.modalAuthors}>{article.authors} · {article.year}</Text>
              <Text style={styles.modalJournal}>{article.journal}</Text>
            </View>

            <View style={styles.modalBlock}>
              <View style={styles.modalBlockHeader}>
                <Ionicons name="bulb-outline" size={16} color={Colors.accent} />
                <Text style={styles.modalBlockTitle}>Neden bu oyunu oynuyoruz?</Text>
              </View>
              <Text style={styles.modalSummary}>{article.user_summary}</Text>
            </View>

            <View style={styles.modalBlock}>
              <View style={styles.modalBlockHeader}>
                <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.modalBlockTitle}>Akademik Özet</Text>
              </View>
              <Text style={styles.modalAbstract}>{article.academic_abstract}</Text>
            </View>

            <View style={styles.modalActions}>
              {article.doi_link && (
                <TouchableOpacity
                  style={styles.doiBtn}
                  onPress={() => Linking.openURL(article.doi_link!)}
                >
                  <Ionicons name="open-outline" size={14} color={Colors.accent} />
                  <Text style={styles.doiBtnText}>Orijinal Makale (DOI)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.libraryBtn}
                onPress={() => { onClose(); router.push({ pathname: '/(tabs)/articles/[id]', params: { id: article.id } }) }}
              >
                <Text style={styles.libraryBtnText}>Kütüphanede Aç →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.noArticle}>Bu domain için makale bulunamadı.</Text>
        )}
      </View>
    </Modal>
  )
}

type GameTileProps = {
  domain: string
  meta: typeof DOMAIN_META[string]
  elo: number
  played: number
  iconSize: number
  onSciencePress?: (gameId: string) => void
  enteringDelay?: number
}

function GameTileBase({
  domain, meta, elo, played, iconSize, onSciencePress, enteringDelay,
}: GameTileProps) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const eloColor = elo >= 1200 ? Colors.success : elo >= 1000 ? Colors.accent : Colors.warning
  const eloLabel = elo >= 1200 ? 'İleri' : elo >= 1000 ? 'Orta' : 'Başlangıç'
  const isComingSoon = !meta.gameId

  return (
    <Animated.View
      style={[styles.tile, { width: iconSize }]}
      entering={FadeInDown.delay(enteringDelay ?? 300).springify()}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.87, { damping: 14, stiffness: 300 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 300 }) }}
        onPress={() => {
          if (!meta.gameId) {
            Alert.alert('Yakında', `${meta.label} modülü yakında ekleniyor.`)
            return
          }
          router.push({ pathname: '/cognitive/play', params: { domain } })
        }}
      >
        <Animated.View
          style={[
            styles.tileIcon,
            {
              width: iconSize, height: iconSize,
              backgroundColor: isComingSoon ? Colors.border : meta.color,
              shadowColor: meta.shadowColor,
            },
            animStyle,
          ]}
        >
          <View style={styles.tileHighlight} />
          <Text style={[styles.tileEmoji, { fontSize: iconSize * 0.38, opacity: isComingSoon ? 0.5 : 1 }]}>
            {meta.emoji}
          </Text>
          {!isComingSoon && (
            <View style={[styles.eloIndicator, { backgroundColor: eloColor + 'CC' }]}>
              <View style={[styles.eloDot, { backgroundColor: eloColor }]} />
            </View>
          )}
          {!isComingSoon && onSciencePress && meta.gameId && (
            <TouchableOpacity style={styles.scienceBadge} onPress={() => onSciencePress(meta.gameId!)} hitSlop={8}>
              <Text style={styles.scienceBadgeText}>🔬</Text>
            </TouchableOpacity>
          )}
          {isComingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Yakında</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
      <Text style={styles.tileName} numberOfLines={1}>{meta.label}</Text>
      <Text style={[styles.tileSub, { color: isComingSoon ? Colors.textMuted : eloColor }]}>
        {isComingSoon ? 'Yakında' : eloLabel}
      </Text>
    </Animated.View>
  )
}
const GameTile = memo(GameTileBase)

function StatsStrip({ ratings }: { ratings: DomainRating[] }) {
  const totalPlayed = ratings.reduce((s, r) => s + r.games_played, 0)
  const trained = ratings.filter(r => r.games_played > 0)
  const successPct = trained.length === 0
    ? 0
    : Math.round(
        trained.reduce((s, r) => s + Math.min(100, Math.max(0, ((r.elo_rating - 800) / 400) * 100)), 0)
        / trained.length
      )

  return (
    <Animated.View style={styles.statsStrip} entering={FadeInDown.delay(100).springify()}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalPlayed}</Text>
        <Text style={styles.statLabel}>Toplam Oyun</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{successPct}%</Text>
        <Text style={styles.statLabel}>Başarı</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{trained.length} / {Object.keys(DOMAIN_META).length}</Text>
        <Text style={styles.statLabel}>Aktif Alan</Text>
      </View>
    </Animated.View>
  )
}

export default function HomeScreen() {
  const { user, isGuest, logout, clearGuest } = useAuthStore()
  const { get, del } = useApi()
  const { width } = useWindowDimensions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scienceGameId, setScienceGameId] = useState<string | null>(null)

  const handleSciencePress = useCallback((gameId: string) => setScienceGameId(gameId), [])

  const { data: dashData } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => get<DashboardData>('/dashboard/today'),
    retry: false,
    enabled: !isGuest,
  })

  const { data: cogData } = useQuery<{ ratings: DomainRating[] }>({
    queryKey: ['cognitive-ratings'],
    queryFn: () => get('/cognitive/ratings'),
    retry: false,
  })

  const ratings = cogData?.ratings ?? []

  const PADDING = 24
  const GAP = 14
  const COLS = 3
  const iconSize = Math.floor((width - PADDING * 2 - GAP * (COLS - 1)) / COLS)

  const domains = Object.entries(DOMAIN_META)

  async function handleLogout() {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: async () => {
          setProfileOpen(false)
          await logout()
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  async function handleGuestExit() {
    setProfileOpen(false)
    await clearGuest()
    router.replace('/(auth)/welcome')
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Devam Et', style: 'destructive', onPress: confirmDelete },
      ]
    )
  }

  function confirmDelete() {
    Alert.alert(
      'Emin misiniz?',
      'Hesabınız ve tüm beyin sağlığı verileriniz silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Hesabı Kalıcı Sil', style: 'destructive', onPress: deleteAccount },
      ]
    )
  }

  async function deleteAccount() {
    await del('/user')
    await logout()
    setProfileOpen(false)
    router.replace('/(auth)/welcome')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={12}>
          <Ionicons name="menu-outline" size={28} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>BrainLongevity</Text>

        <TouchableOpacity onPress={() => setProfileOpen(true)} hitSlop={12}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {isGuest ? '?' : (user?.displayName?.[0]?.toUpperCase() ?? '?')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(50)}>
          <GuestBanner />
        </Animated.View>

        {dashData && dashData.streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{dashData.streak} günlük seri</Text>
          </View>
        )}

        <StatsStrip ratings={ratings} />

        <Animated.Text style={styles.sectionLabel} entering={FadeInDown.delay(200).springify()}>
          OYUNLAR
        </Animated.Text>

        <View style={styles.grid}>
          {domains.map(([domain, meta], index) => {
            const rating = ratings.find(r => r.domain === domain)
            return (
              <GameTile
                key={domain}
                domain={domain}
                meta={meta}
                elo={rating?.elo_rating ?? 1000}
                played={rating?.games_played ?? 0}
                iconSize={iconSize}
                onSciencePress={meta.gameId ? handleSciencePress : undefined}
                enteringDelay={index * 80 + 300}
              />
            )
          })}
        </View>

        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.hintText}>🔬 simgesi olan oyunların bilimsel altyapısını görebilirsin</Text>
        </View>
      </ScrollView>

      {scienceGameId && (
        <ScienceModal gameId={scienceGameId} onClose={() => setScienceGameId(null)} />
      )}

      <BrainHealthDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Modal visible={profileOpen} animationType="slide" transparent onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={styles.profileOverlay} onPress={() => setProfileOpen(false)} />
        <View style={styles.profileSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarLetter}>
                {isGuest ? '?' : (user?.displayName?.[0]?.toUpperCase() ?? '?')}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {isGuest ? 'Misafir Kullanıcı' : (user?.displayName ?? '—')}
              </Text>
              {!isGuest && user?.email && (
                <Text style={styles.profileEmail}>{user.email}</Text>
              )}
            </View>
            {!isGuest && (
              <View style={styles.modePill}>
                <Text style={styles.modePillText}>
                  {user?.mode === 'biohacker' ? '⚡ Biohacker' : '🌿 Longevity'}
                </Text>
              </View>
            )}
          </View>

          {isGuest ? (
            <>
              <TouchableOpacity
                style={styles.createAccountBtn}
                onPress={() => { setProfileOpen(false); router.push('/(auth)/register') }}
              >
                <Text style={styles.createAccountBtnText}>Ücretsiz Hesap Oluştur</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleGuestExit}>
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                <Text style={styles.logoutBtnText}>Misafir Modundan Çık</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.menuLink}
                onPress={() => { setProfileOpen(false); router.push('/caregiver/manage') }}
              >
                <Ionicons name="people-outline" size={18} color={Colors.accent} />
                <Text style={styles.menuLinkText}>Bakıcılar & Takip</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={styles.deleteAccountBtnText}>Hesabı Sil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 14, fontWeight: '800', color: '#fff' },

  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 16 },

  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#FFF8E7', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#F59E0B',
  },
  streakEmoji: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.2, marginTop: 4,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  tile: { alignItems: 'center', gap: 6 },
  tileIcon: {
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  tileHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  tileEmoji: { zIndex: 1 },
  eloIndicator: {
    position: 'absolute', bottom: 7, right: 7,
    width: 10, height: 10, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  eloDot: { width: 6, height: 6, borderRadius: 3 },
  scienceBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  scienceBadgeText: { fontSize: 10 },
  comingSoonBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  comingSoonText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tileName: { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  tileSub: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
  },
  hintText: { fontSize: 12, color: Colors.textMuted },

  // Science modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, maxHeight: '80%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  modalScroll: { maxHeight: 500 },
  modalMeta: {
    gap: 4, marginBottom: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalArticleTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  modalAuthors: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  modalJournal: { fontSize: 12, color: Colors.accent, fontWeight: '600', fontStyle: 'italic' },
  modalBlock: { gap: 8, marginBottom: 20 },
  modalBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalBlockTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  modalSummary: { fontSize: 15, color: Colors.text, lineHeight: 24, fontWeight: '500' },
  modalAbstract: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  modalActions: { gap: 10, marginTop: 4, marginBottom: 8 },
  doiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.accent, borderRadius: 12, paddingVertical: 12,
  },
  doiBtnText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  libraryBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  libraryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  noArticle: { textAlign: 'center', color: Colors.textMuted, marginTop: 32, marginBottom: 32 },

  // Profil bottom sheet
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  profileSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, gap: 12,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  profileInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarLetter: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileDetails: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  modePill: {
    backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  modePillText: { fontSize: 11, fontWeight: '600', color: Colors.text },

  menuLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  menuLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },

  createAccountBtn: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  createAccountBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error,
  },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },

  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  deleteAccountBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },
})
