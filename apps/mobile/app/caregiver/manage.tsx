import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'

type CaregiverLink = {
  link_id: string
  caregiver_id: string
  display_name: string
  email: string
  relationship: string
  linked_at: string
}

type PatientLink = {
  link_id: string
  patient_id: string
  display_name: string
  email: string
  relationship: string
  linked_at: string
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'Eş',
  child: 'Çocuk',
  sibling: 'Kardeş',
  professional: 'Sağlık Profesyoneli',
  friend: 'Arkadaş',
}

export default function CaregiverManageScreen() {
  const { get, del } = useApi()
  const [caregivers, setCaregivers] = useState<CaregiverLink[]>([])
  const [patients, setPatients] = useState<PatientLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [cgRes, ptRes] = await Promise.all([
        get<{ caregivers: CaregiverLink[] }>('/caregiver/my-caregivers'),
        get<{ patients: PatientLink[] }>('/caregiver/patients'),
      ])
      setCaregivers(cgRes.caregivers)
      setPatients(ptRes.patients)
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function removeLink(linkId: string, name: string) {
    Alert.alert('Bağlantıyı Kaldır', `${name} ile bağlantıyı kaldırmak istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/caregiver/link/${linkId}`)
            load()
          } catch (e: any) {
            Alert.alert('Hata', e.message)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Bakıcı Sistemi' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        {/* Bakıcılarım */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bakıcılarım</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/caregiver/invite')}
            >
              <Ionicons name="add" size={18} color={Colors.accent} />
              <Text style={styles.addBtnText}>Davet Et</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDesc}>Sizi takip eden kişiler</Text>

          {caregivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz bakıcınız yok</Text>
              <Text style={styles.emptySubText}>Aile üyelerinize davet kodu gönderin</Text>
            </View>
          ) : (
            caregivers.map((cg) => (
              <View key={cg.link_id} style={styles.card}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.avatarText}>{cg.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{cg.display_name}</Text>
                  <Text style={styles.cardSub}>{RELATIONSHIP_LABELS[cg.relationship] ?? cg.relationship}</Text>
                </View>
                <TouchableOpacity onPress={() => removeLink(cg.link_id, cg.display_name)}>
                  <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Takip Ettiklerim */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Takip Ettiklerim</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/caregiver/accept')}
            >
              <Ionicons name="add" size={18} color={Colors.accent} />
              <Text style={styles.addBtnText}>Kod Gir</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDesc}>Sağlığını izlediğiniz kişiler</Text>

          {patients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz kimseyi takip etmiyorsunuz</Text>
              <Text style={styles.emptySubText}>Davet kodunu girerek başlayın</Text>
            </View>
          ) : (
            patients.map((pt) => (
              <TouchableOpacity
                key={pt.link_id}
                style={styles.card}
                onPress={() => router.push({ pathname: '/caregiver/patient-summary', params: { patientId: pt.patient_id, name: pt.display_name } })}
              >
                <View style={[styles.cardAvatar, { backgroundColor: '#E8F5F3' }]}>
                  <Text style={[styles.avatarText, { color: Colors.accent }]}>{pt.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{pt.display_name}</Text>
                  <Text style={styles.cardSub}>{RELATIONSHIP_LABELS[pt.relationship] ?? pt.relationship}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 24 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sectionDesc: { fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', gap: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary },
})
