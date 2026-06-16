import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('Hata', 'E-posta adresi gerekli.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Bir hata oluştu')

      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
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

          <Text style={styles.title}>Şifre Sıfırla</Text>
          <Text style={styles.subtitle}>
            E-posta adresinizi girin, sıfırlama bağlantısı göndereceğiz.
          </Text>

          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                E-posta gönderildi! Spam klasörünü de kontrol edin.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.buttonText}>Giriş Sayfasına Dön</Text>
              </TouchableOpacity>
            </View>
          ) : (
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

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  successContainer: { gap: 20 },
  successText: { fontSize: 16, color: Colors.success, lineHeight: 24, textAlign: 'center', marginTop: 16 },
})
