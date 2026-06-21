import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSubmit() {
    if (!token) {
      Alert.alert('Hata', 'Geçersiz sıfırlama bağlantısı.')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        const serverMessage: string = data.error ?? ''
        const userMessage = serverMessage.includes('geçersiz') || serverMessage.includes('süresi')
          ? 'Bağlantının süresi dolmuş, tekrar isteyin.'
          : serverMessage || 'Bir hata oluştu.'
        throw new Error(userMessage)
      }

      Alert.alert('Başarılı', 'Şifreniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.replace('/(auth)/login') },
      ])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu.'
      Alert.alert('Hata', message)
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
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Yeni Şifre</Text>
          <Text style={styles.subtitle}>
            Hesabınız için yeni bir şifre belirleyin.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Yeni Şifre</Text>
              <TextInput
                style={[styles.input, passwordTooShort && styles.inputError]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="En az 8 karakter"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passwordTooShort && (
                <Text style={styles.errorText}>Şifre en az 8 karakter olmalıdır.</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Şifreyi Doğrula</Text>
              <TextInput
                style={[styles.input, passwordsMismatch && styles.inputError]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passwordsMismatch && (
                <Text style={styles.errorText}>Şifreler eşleşmiyor.</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Kaydediliyor...' : 'Şifremi Güncelle'}
              </Text>
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
  backButton: { marginBottom: 24 },
  backText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
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
  inputError: { borderColor: Colors.error ?? '#E53935' },
  errorText: { fontSize: 13, color: Colors.error ?? '#E53935' },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
})
