import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
 } from 'react-native'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { Colors } from '../../constants/colors'
import { useAuthStore } from '../../store/auth'
import { Ionicons } from '@expo/vector-icons'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { setToken, setGuest } = useAuthStore()

  async function handleGuest() {
    await setGuest()
    router.replace('/(tabs)')
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.')
      return
    }

    setLoading(true)
    try {
      let res: Response
      try {
        res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
      } catch (networkErr) {
        console.error('[Login] Network error:', networkErr)
        Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. İnternet bağlantınızı veya sunucunun çalıştığını kontrol edin.')
        return
      }

      const data = await res.json()
      const errorMap: Record<string, string> = {
        'Email already registered': 'Bu e-posta adresi zaten kayıtlı.',
        'Invalid credentials': 'E-posta veya şifre hatalı.',
        'User not found': 'Kullanıcı bulunamadı.',
      }
      if (!res.ok) throw new Error(errorMap[data.error] ?? data.error ?? 'Giriş başarısız')

      await setToken(data.accessToken)
      await SecureStore.setItemAsync('refresh_token', data.refreshToken)
      router.replace('/(tabs)')
    } catch (err: unknown) {
      console.error('[Login] Error:', err)
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      Alert.alert('Giriş Hatası', message)
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

          <Text style={styles.title}>Giriş Yap</Text>
          <Text style={styles.subtitle}>Hesabınıza devam edin</Text>

          <View style={styles.form}>
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
                placeholder="Şifrenizi girin"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: '600' }}>Şifremi Unuttum?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>
                Hesabın yok mu? <Text style={styles.registerLinkBold}>Kayıt Ol</Text>
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
  content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  guestButton: { alignItems: 'center', paddingVertical: 8 },
  guestText: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },
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
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  registerLink: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  registerLinkBold: { fontWeight: '700', color: Colors.primary },
})
