import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'

export default function InviteScreen() {
  const { post } = useApi()
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateCode()
  }, [])

  async function generateCode() {
    setLoading(true)
    try {
      const res = await post<{ code: string; expiresAt: string }>('/caregiver/invite/generate', {})
      setCode(res.code)
      setExpiresAt(res.expiresAt)
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function shareCode() {
    if (!code) return
    await Share.share({
      message: `BrainLongevity bakıcı davet kodunuz: ${code}\n\nBu kod 24 saat geçerlidir. Uygulamada "Bakıcı Sistemi → Kod Gir" bölümüne gidin.`,
    })
  }

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })
    : ''

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Bakıcı Davet Et' }} />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="people-outline" size={40} color={Colors.accent} />
        </View>

        <Text style={styles.title}>Davet Kodu</Text>
        <Text style={styles.desc}>
          Bu kodu aile üyenizle paylaşın. Bakıcı, uygulamada bu kodu girerek sağlık verilerinizi takip edebilir.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{code}</Text>
            </View>

            {expiryText ? (
              <Text style={styles.expiry}>Son geçerlilik: {expiryText}</Text>
            ) : null}

            <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
              <Ionicons name="share-outline" size={20} color={Colors.white} />
              <Text style={styles.shareBtnText}>Kodu Paylaş</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshBtn} onPress={generateCode}>
              <Ionicons name="refresh-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.refreshBtnText}>Yeni Kod Oluştur</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.accent} />
          <Text style={styles.infoText}>
            Bakıcılar yalnızca sağlık özetinizi görebilir. Detaylı veriler ve günlük notlarınız gizlidir.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', gap: 16 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  desc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  codeBox: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 48, marginTop: 8 },
  codeText: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: 8 },
  expiry: { fontSize: 13, color: Colors.textMuted },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', justifyContent: 'center' },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshBtnText: { fontSize: 14, color: Colors.textSecondary },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'flex-start', marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
})
