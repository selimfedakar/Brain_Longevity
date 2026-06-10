import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { useApi } from '../../../hooks/useApi'
import { useAuthStore } from '../../../store/auth'
import { GuestBanner } from '../../../components/GuestBanner'

interface LeaderboardEntry {
  user_id: string
  display_name: string
  bhi: number | null
  rank: number
}

interface FriendRequest {
  id: string
  requester_name: string
  requester_id: string
  created_at: string
}

interface SearchResult {
  id: string
  display_name: string
  mode: string
}

function BHIBadge({ score }: { score: number | null }) {
  const value = score ?? 0
  const color = value >= 70 ? Colors.success : value >= 50 ? Colors.warning : Colors.error
  return (
    <View style={[styles.bhiBadge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.bhiNum, { color }]}>{score !== null ? Math.round(score) : '—'}</Text>
      <Text style={[styles.bhiLabel, { color }]}>BHI</Text>
    </View>
  )
}

export default function SocialScreen() {
  const { get, post, put } = useApi()
  const qc = useQueryClient()
  const { isGuest, user } = useAuthStore()
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<'leaderboard' | 'friends'>('leaderboard')

  const { data: leaderboard = [], isLoading: lbLoading, refetch: refetchLb } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => get('/social/leaderboard'),
    enabled: !isGuest,
  })

  const { data: requests = [], refetch: refetchReqs } = useQuery<FriendRequest[]>({
    queryKey: ['friend-requests'],
    queryFn: () => get('/social/friend-requests'),
    enabled: !isGuest,
  })

  const acceptMutation = useMutation({
    mutationFn: (id: string) => put(`/social/friend-request/${id}/accept`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      refetchReqs()
    },
  })

  const sendRequestMutation = useMutation({
    mutationFn: (addresseeId: string) => post('/social/friend-request', { addresseeId }),
    onSuccess: () => {
      Alert.alert('Gönderildi', 'Arkadaşlık isteği gönderildi.')
      setSearchResults([])
      setSearchQ('')
    },
    onError: (e: Error) => Alert.alert('Hata', e.message),
  })

  async function handleSearch() {
    if (searchQ.length < 2) return
    setSearching(true)
    try {
      const res = await get<SearchResult[]>(`/social/search?q=${encodeURIComponent(searchQ)}`)
      setSearchResults(res)
    } catch {
      Alert.alert('Hata', 'Arama başarısız')
    } finally {
      setSearching(false)
    }
  }

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <GuestBanner />
        <View style={styles.guestBox}>
          <Text style={styles.guestEmoji}>👥</Text>
          <Text style={styles.guestTitle}>Sosyal özellikler için hesap gerekli</Text>
          <Text style={styles.guestDesc}>Arkadaşlarınızla BHI karşılaştırın, meydan okuyun.</Text>
          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.signupBtnText}>Hesap Oluştur</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={lbLoading} onRefresh={() => { refetchLb(); refetchReqs() }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Sosyal</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/social/challenges')}>
            <View style={styles.challengeBtn}>
              <Ionicons name="trophy-outline" size={16} color={Colors.accent} />
              <Text style={styles.challengeBtnText}>Meydan Okumalar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bekleyen istekler */}
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bekleyen İstekler</Text>
            {requests.map(req => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestAvatar}>
                  <Text style={styles.requestAvatarText}>{req.requester_name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.requestName}>{req.requester_name}</Text>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => acceptMutation.mutate(req.id)}
                  disabled={acceptMutation.isPending}
                >
                  <Text style={styles.acceptBtnText}>Kabul Et</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Arkadaş arama */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arkadaş Ekle</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="İsme göre ara..."
              placeholderTextColor={Colors.textMuted}
              value={searchQ}
              onChangeText={setSearchQ}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
              {searching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>

          {searchResults.map(r => (
            <View key={r.id} style={styles.searchResult}>
              <View style={styles.requestAvatar}>
                <Text style={styles.requestAvatarText}>{r.display_name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.requestName}>{r.display_name}</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => sendRequestMutation.mutate(r.id)}
                disabled={sendRequestMutation.isPending}
              >
                <Ionicons name="person-add-outline" size={16} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Liderlik tablosu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liderlik Tablosu — Bugün</Text>
          {lbLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 16 }} />
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz arkadaş yok. Yukarıdan arkadaş ekleyin!</Text>
            </View>
          ) : (
            leaderboard.map((entry, idx) => {
              const isMe = entry.user_id === user?.id
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              return (
                <View key={entry.user_id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                  <Text style={styles.rankNum}>{medal ?? `#${entry.rank}`}</Text>
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>{entry.display_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.rankName, isMe && styles.rankNameMe]} numberOfLines={1}>
                    {isMe ? 'Sen' : entry.display_name}
                  </Text>
                  <BHIBadge score={entry.bhi} />
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  challengeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FAFA', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  challengeBtnText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  requestAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  requestAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  requestName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  acceptBtn: {
    backgroundColor: Colors.success, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  acceptBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text,
  },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    width: 46, alignItems: 'center', justifyContent: 'center',
  },
  searchResult: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: '#F0FAFA', borderRadius: 8,
    padding: 8, borderWidth: 1, borderColor: Colors.accent + '50',
  },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  rankRowMe: { borderColor: Colors.accent, backgroundColor: '#F0FAFA' },
  rankNum: { fontSize: 18, width: 36, textAlign: 'center' },
  rankAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  rankAvatarText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  rankName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  rankNameMe: { color: Colors.primary, fontWeight: '800' },
  bhiBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  bhiNum: { fontSize: 18, fontWeight: '900' },
  bhiLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  guestBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  guestEmoji: { fontSize: 56 },
  guestTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  guestDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  signupBtn: {
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  signupBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
})
