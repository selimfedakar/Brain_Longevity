import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Colors } from '../constants/colors'
import { useAuthStore } from '../store/auth'

export function GuestBanner() {
  const { isGuest } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)

  if (!isGuest || dismissed) return null

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-outline" size={18} color="#92400E" style={styles.icon} />
      <Text style={styles.text} numberOfLines={2}>
        Geçmişinizi kaydetmek için{' '}
        <Text
          style={styles.link}
          onPress={() => router.push('/(auth)/register')}
        >
          ücretsiz hesap oluşturun
        </Text>
      </Text>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={12}>
        <Ionicons name="close" size={18} color="#92400E" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  icon: { flexShrink: 0 },
  text: { flex: 1, fontSize: 13, color: '#78350F', lineHeight: 18 },
  link: { fontWeight: '700', textDecorationLine: 'underline', color: '#92400E' },
})
