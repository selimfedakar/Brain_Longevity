import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Colors } from '../../../constants/colors'
import { useApi } from '../../../hooks/useApi'

interface Challenge {
  id: string
  title: string
  type: 'bhi' | 'cognitive_elo' | 'diet_mind' | 'streak'
  target: number
  start_date: string
  end_date: string
  creator_name: string
  participant_count: number
  joined: boolean
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  bhi:           { label: 'BHI Skoru',        emoji: '🧠' },
  cognitive_elo: { label: 'Kognitif ELO',     emoji: '🎯' },
  diet_mind:     { label: 'MIND Diyet',       emoji: '🥦' },
  streak:        { label: 'Günlük Seri',      emoji: '🔥' },
}

function ChallengeCard({ challenge, onJoin }: { challenge: Challenge; onJoin: () => void }) {
  const meta = TYPE_LABELS[challenge.type] ?? { label: challenge.type, emoji: '⚡' }
  const end = new Date(challenge.end_date)
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000))

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardSub}>{meta.label} · Hedef: {challenge.target}</Text>
        </View>
        {challenge.joined && (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.success} />
            <Text style={styles.joinedText}>Katıldın</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          👥 {challenge.participant_count} katılımcı · {daysLeft} gün kaldı
        </Text>
        <Text style={styles.cardCreator}>@{challenge.creator_name}</Text>
      </View>

      {!challenge.joined && (
        <TouchableOpacity style={styles.joinBtn} onPress={onJoin}>
          <Text style={styles.joinBtnText}>Katıl →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function ChallengesScreen() {
  const { get, post } = useApi()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: 'bhi' as Challenge['type'],
    target: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  })

  const { data: challenges = [], isLoading, refetch } = useQuery<Challenge[]>({
    queryKey: ['challenges'],
    queryFn: () => get('/social/challenges'),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => post(`/social/challenges/${id}/join`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
    onError: (e: Error) => Alert.alert('Hata', e.message),
  })

  const createMutation = useMutation({
    mutationFn: () => post('/social/challenges', {
      title: form.title,
      type: form.type,
      target: Number(form.target),
      startDate: form.startDate,
      endDate: form.endDate,
    }),
    onSuccess: () => {
      setShowCreate(false)
      setForm({ title: '', type: 'bhi', target: '', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
      qc.invalidateQueries({ queryKey: ['challenges'] })
      Alert.alert('Oluşturuldu!', 'Meydan okuma oluşturuldu ve siz katıldınız.')
    },
    onError: (e: Error) => Alert.alert('Hata', e.message),
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Meydan Okumalar</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Arkadaşlarınla rekabet et, birlikte büyü</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : challenges.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>Henüz meydan okuma yok</Text>
            <Text style={styles.emptyDesc}>İlk meydan okumayı sen oluştur!</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          challenges.map(c => (
            <ChallengeCard key={c.id} challenge={c} onJoin={() => joinMutation.mutate(c.id)} />
          ))
        )}
      </ScrollView>

      {/* Oluşturma modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Meydan Okuma Oluştur</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Başlık</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Bu hafta 80 BHI!"
              placeholderTextColor={Colors.textMuted}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
            />

            <Text style={styles.fieldLabel}>Tür</Text>
            <View style={styles.typeGrid}>
              {(Object.entries(TYPE_LABELS) as [Challenge['type'], { label: string; emoji: string }][]).map(([key, meta]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeBtn, form.type === key && styles.typeBtnActive]}
                  onPress={() => setForm(f => ({ ...f, type: key }))}
                >
                  <Text style={styles.typeBtnEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.typeBtnLabel, form.type === key && styles.typeBtnLabelActive]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Hedef Değer</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 80"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={form.target}
              onChangeText={v => setForm(f => ({ ...f, target: v }))}
            />

            <Text style={styles.fieldLabel}>Bitiş Tarihi</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={form.endDate}
              onChangeText={v => setForm(f => ({ ...f, endDate: v }))}
            />

            <TouchableOpacity
              style={[styles.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Oluştur & Katıl</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: -8 },
  createBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardEmoji: { fontSize: 28, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  joinedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  joinedText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { fontSize: 13, color: Colors.textMuted },
  cardCreator: { fontSize: 12, color: Colors.textMuted },
  joinBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  joinBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 40,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 10,
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  modalContent: { padding: 24, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: Colors.text,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flexBasis: '47%', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: Colors.border, gap: 6,
  },
  typeBtnActive: { borderColor: Colors.accent, backgroundColor: '#F0FAFA' },
  typeBtnEmoji: { fontSize: 24 },
  typeBtnLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  typeBtnLabelActive: { color: Colors.primary, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
})
