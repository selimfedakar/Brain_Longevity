import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  Modal, ActivityIndicator, Linking, useWindowDimensions, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'
import { STATIC_ARTICLES } from '../../constants/articles'

interface DomainRating {
  domain: string
  elo_rating: number
  games_played: number
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
    label: 'İşlem Hızı', emoji: '⚡', description: 'Symbol Match, Trail Making',
    color: '#FFB347', shadowColor: '#FFB347',
  },
  multitasking: {
    label: 'Çoklu Görev', emoji: '🔄', description: 'Dual Task',
    color: '#6BCB77', shadowColor: '#6BCB77',
  },
  spatial: {
    label: 'Uzamsal', emoji: '🧩', description: 'Mental Rotation, Spatial Span',
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
    select: (data) => data ?? STATIC_ARTICLES.find(a => a.game_id === gameId) ?? null,
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

function GameTile({
  domain, meta, elo, played, iconSize, onSciencePress,
}: {
  domain: string
  meta: typeof DOMAIN_META[string]
  elo: number
  played: number
  iconSize: number
  onSciencePress?: () => void
}) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const eloColor = elo >= 1200 ? Colors.success : elo >= 1000 ? Colors.accent : Colors.warning
  const eloLabel = elo >= 1200 ? 'İleri' : elo >= 1000 ? 'Orta' : 'Başlangıç'
  const isComingSoon = !meta.gameId

  return (
    <View style={[styles.tile, { width: iconSize }]}>
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
          {!isComingSoon && onSciencePress && (
            <TouchableOpacity style={styles.scienceBadge} onPress={onSciencePress} hitSlop={8}>
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
    </View>
  )
}

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
    <View style={styles.statsStrip}>
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
    </View>
  )
}

export default function CognitiveScreen() {
  const { get } = useApi()
  const { width } = useWindowDimensions()
  const [scienceGameId, setScienceGameId] = useState<string | null>(null)

  const { data } = useQuery<{ ratings: DomainRating[] }>({
    queryKey: ['cognitive-ratings'],
    queryFn: () => get('/cognitive/ratings'),
    retry: false,
  })

  const MOCK_RATINGS: DomainRating[] = [
    { domain: 'attention', elo_rating: 1000, games_played: 0 },
    { domain: 'working_memory', elo_rating: 1000, games_played: 0 },
    { domain: 'processing_speed', elo_rating: 1000, games_played: 0 },
    { domain: 'multitasking', elo_rating: 1000, games_played: 0 },
    { domain: 'spatial', elo_rating: 1000, games_played: 0 },
    { domain: 'executive_function', elo_rating: 1000, games_played: 0 },
  ]

  const ratings = data?.ratings ?? MOCK_RATINGS

  const PADDING = 24
  const GAP = 14
  const COLS = 3
  const iconSize = Math.floor((width - PADDING * 2 - GAP * (COLS - 1)) / COLS)

  const domains = Object.entries(DOMAIN_META)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Kognitif Antrenman</Text>
        <Text style={styles.subtitle}>ELO sistemiyle kişiselleştirilmiş oyunlar</Text>

        <StatsStrip ratings={ratings} />

        <Text style={styles.sectionLabel}>OYUNLAR</Text>

        <View style={styles.grid}>
          {domains.map(([domain, meta]) => {
            const rating = ratings.find(r => r.domain === domain)
            return (
              <GameTile
                key={domain}
                domain={domain}
                meta={meta}
                elo={rating?.elo_rating ?? 1000}
                played={rating?.games_played ?? 0}
                iconSize={iconSize}
                onSciencePress={meta.gameId ? () => setScienceGameId(meta.gameId!) : undefined}
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.surface, borderRadius: 16, paddingVertical: 16,
    marginTop: 20, borderWidth: 1, borderColor: Colors.border,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.2, marginTop: 28, marginBottom: 14,
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

  tileName: {
    fontSize: 11, fontWeight: '700', color: Colors.text,
    textAlign: 'center',
  },
  tileSub: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 24, justifyContent: 'center',
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
})
