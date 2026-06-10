import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
 } from 'react-native'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Colors } from '../../constants/colors'
import { useAuthStore } from '../../store/auth'
import { migrateGuestDataToBackend } from '../../store/guestStore'
import { useApi } from '../../hooks/useApi'
import { Ionicons } from '@expo/vector-icons'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

type Mode = 'biohacker' | 'longevity'

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('biohacker')
  const [loading, setLoading] = useState(false)

  const { setToken, setUser, isGuest, clearGuest, setGuest } = useAuthStore()
  const { post } = useApi()

  async function handleGuest() {
    await setGuest()
    router.replace('/(tabs)')
  }

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.')
      return
    }

    setLoading(true)
    try {
      console.log('[Register] Hedef URL:', API_URL)
      let res: Response
      try {
        res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, email, password, mode }),
        })
      } catch (networkErr) {
        console.error('[Register] Network error:', networkErr)
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantınızı veya sunucunun çalıştığını kontrol edin.')
        return
      }

      const data = await res.json()
      const errorMap: Record<string, string> = {
        'Email already registered': 'Bu e-posta adresi zaten kayıtlı.',
        'Invalid credentials': 'E-posta veya şifre hatalı.',
        'User not found': 'Kullanıcı bulunamadı.',
      }
      if (!res.ok) throw new Error(errorMap[data.error] ?? data.error ?? 'Kayıt başarısız')

      await setToken(data.accessToken)
      await SecureStore.setItemAsync('refresh_token', data.refreshToken)
      setUser({ id: data.userId, email, displayName, mode, onboardingComplete: false })

      if (isGuest) {
        await migrateGuestDataToBackend(post)
        await clearGuest()
      }

      router.replace('/(onboarding)')
    } catch (err: unknown) {
      console.error('[Register] Error:', err)
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      Alert.alert('Kayıt Hatası', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Beyin sağlığı yolculuğuna başlayın</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="En az 8 karakter"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
              {password.length > 0 && password.length < 8 && (
                <Text style={styles.fieldError}>En az 8 karakter gerekli</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mod Seçin</Text>
              <View style={styles.modeContainer}>
                <TouchableOpacity
                  style={[styles.modeOption, mode === 'biohacker' && styles.modeOptionActive]}
                  onPress={() => setMode('biohacker')}
                >
                  <Text style={styles.modeEmoji}>⚡</Text>
                  <Text style={[styles.modeTitle, mode === 'biohacker' && styles.modeTitleActive]}>
                    Biohacker
                  </Text>
                  <Text style={styles.modeDesc}>30-50 yaş, optimizasyon</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeOption, mode === 'longevity' && styles.modeOptionActive]}
                  onPress={() => setMode('longevity')}
                >
                  <Text style={styles.modeEmoji}>🌿</Text>
                  <Text style={[styles.modeTitle, mode === 'longevity' && styles.modeTitleActive]}>
                    Longevity
                  </Text>
                  <Text style={styles.modeDesc}>Destekleyici, sade</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || (password.length > 0 && password.length < 8)) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading || (password.length > 0 && password.length < 8)}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>
                Zaten hesabın var mı? <Text style={styles.loginLinkBold}>Giriş Yap</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGuest} style={styles.guestButton}>
              <Text style={styles.guestText}>Misafir Olarak Devam Et</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  modeContainer: { flexDirection: 'row', gap: 12 },
  modeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 4,
  },
  modeOptionActive: { borderColor: Colors.accent, backgroundColor: '#F0FAFA' },
  modeEmoji: { fontSize: 24 },
  modeTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  modeTitleActive: { color: Colors.primary },
  modeDesc: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: -4 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  loginLink: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  loginLinkBold: { fontWeight: '700', color: Colors.primary },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  guestButton: { alignItems: 'center', paddingVertical: 8 },
  guestText: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },
})
