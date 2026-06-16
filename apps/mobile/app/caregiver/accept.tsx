import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse',       label: 'Eş' },
  { value: 'child',        label: 'Çocuk' },
  { value: 'sibling',      label: 'Kardeş' },
  { value: 'professional', label: 'Sağlık Profesyoneli' },
  { value: 'friend',       label: 'Arkadaş' },
] as const

type Relationship = typeof RELATIONSHIP_OPTIONS[number]['value']

export default function AcceptInviteScreen() {
  const { post } = useApi()
  const [code, setCode] = useState('')
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    if (code.trim().length !== 6) {
      Alert.alert('Hata', 'Davet kodu 6 karakter olmalıdır')
      return
    }
    if (!relationship) {
      Alert.alert('Hata', 'Lütfen yakınlık türünü seçin')
      return
    }

    setLoading(true)
    try {
      const res = await post<{ patient: { display_name: string } }>('/caregiver/invite/accept', {
        code: code.toUpperCase(),
        relationship,
      })
      Alert.alert(
        'Bağlantı Kuruldu',
        `${res.patient.display_name} ile bakıcı bağlantısı kuruldu.`,
        [{ text: 'Tamam', onPress: () => router.back() }]
      )
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Davet Kodunu Gir' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={36} color={Colors.accent} />
          </View>

          <Text style={styles.title}>Davet Kodunu Gir</Text>
          <Text style={styles.desc}>
            Yakınınızın size gönderdiği 6 haneli kodu girin. Sağlık verilerini izleyebileceksiniz.
          </Text>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
            placeholder="XXXXXX"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            maxLength={6}
            keyboardType="default"
          />

          <Text style={styles.label}>Yakınlık Türü</Text>
          <View style={styles.relGrid}>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.relBtn, relationship === opt.value && styles.relBtnActive]}
                onPress={() => setRelationship(opt.value)}
              >
                <Text style={[styles.relBtnText, relationship === opt.value && styles.relBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!code || !relationship) && styles.submitBtnDisabled]}
            onPress={handleAccept}
            disabled={loading || !code || !relationship}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.submitBtnText}>Bağlantıyı Onayla</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  content: { flex: 1, padding: 24, gap: 16, alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  desc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  codeInput: { width: '100%', backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 20, fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: 10, textAlign: 'center', borderWidth: 2, borderColor: Colors.border },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  relBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  relBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  relBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  relBtnTextActive: { color: Colors.white, fontWeight: '700' },
  submitBtn: { width: '100%', backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
})
