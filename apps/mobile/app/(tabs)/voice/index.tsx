import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Audio as AudioType } from 'expo-av'
let Audio: typeof AudioType | null = null
try { Audio = require('expo-av').Audio } catch { Audio = null }
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, withSequence, Easing,
} from 'react-native-reanimated'
import { useApi } from '../../../hooks/useApi'
import { Colors } from '../../../constants/colors'
import { GuestBanner } from '../../../components/GuestBanner'
import { useAuthStore } from '../../../store/auth'

type PromptType = 'image_narration' | 'story_recall' | 'free_journal' | 'word_association'

const PROMPT_META: Record<PromptType, { label: string; emoji: string; desc: string }> = {
  free_journal:     { label: 'Serbest Günlük',   emoji: '📓', desc: 'Aklınızdaki her şeyi anlatın' },
  story_recall:     { label: 'Anı Hatırlama',    emoji: '🧠', desc: 'Geçmişten bir anıyı anlatın' },
  image_narration:  { label: 'Görsel Anlatım',   emoji: '🖼️', desc: 'Bir sahneyi gözünüzde canlandırın' },
  word_association: { label: 'Kelime İlişkisi',  emoji: '💬', desc: 'Bir kelimeden çağrışımlarınızı anlatın' },
}

// Each bar manages its own animation state — avoids Rules of Hooks violations
function WaveBar({ active, index }: { active: boolean; index: number }) {
  const height = useSharedValue(0.3)

  useEffect(() => {
    if (active) {
      const dur1 = 200 + index * 60
      const dur2 = 200 + index * 40
      height.value = withRepeat(
        withSequence(
          withTiming(0.3 + (index % 3) * 0.25, { duration: dur1, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2 + (index % 2) * 0.2,  { duration: dur2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      )
    } else {
      height.value = withTiming(0.3, { duration: 300 })
    }
  }, [active])

  const animStyle = useAnimatedStyle(() => ({
    height: height.value * 60,
    opacity: active ? 1 : 0.3,
  }))

  return (
    <Animated.View
      style={[
        styles.waveBar,
        animStyle,
        { backgroundColor: active ? Colors.accent : Colors.border },
      ]}
    />
  )
}

export default function VoiceScreen() {
  const { get, upload } = useApi()
  const { isGuest } = useAuthStore()
  const [selectedType, setSelectedType] = useState<PromptType>('free_journal')
  const [prompt, setPrompt] = useState<string>('')
  const [recording, setRecording] = useState<AudioType.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const fetchPrompt = useCallback(async (type: PromptType) => {
    try {
      const data = await get<{ prompt: string }>(`/voice/prompts?type=${type}`)
      setPrompt(data.prompt)
    } catch {
      setPrompt('Bugün kendinizi nasıl hissediyorsunuz?')
    }
  }, [])

  useEffect(() => {
    fetchPrompt(selectedType)
  }, [selectedType])

  const startRecording = async () => {
    if (!Audio) {
      Alert.alert(
        'Native Build Gerekli',
        'Sesli günlük özelliği yalnızca native build ile çalışır. `npx expo run:ios` komutuyla derleyin.'
      )
      return
    }
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert(
          'Mikrofon İzni Gerekli',
          'Sesli günlük için Ayarlar > Gizlilik > Mikrofon bölümünden BrainLongevity uygulamasına izin verin.'
        )
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(rec)
      setIsRecording(true)
      setElapsed(0)
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch {
      Alert.alert('Hata', 'Mikrofon başlatılamadı. Uygulamayı yeniden başlatın.')
    }
  }

  const stopAndUpload = async () => {
    if (!recording) return
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)
      if (!uri) return

      setUploading(true)
      const duration = elapsed

      const formData = new FormData()
      formData.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob)
      formData.append('promptType', selectedType)
      formData.append('durationSeconds', String(duration))

      const result = await upload<{ fluencyScore: number; transcript: string; metrics: unknown; sessionId: string }>('/voice/session', formData)

      router.push({ pathname: '/(tabs)/voice/result', params: { data: JSON.stringify(result) } })
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Bilinmeyen hata')
    } finally {
      setUploading(false)
    }
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <GuestBanner />
        <View style={styles.guestBox}>
          <Text style={styles.guestEmoji}>🎙️</Text>
          <Text style={styles.guestTitle}>Sesli Günlük için üyelik gerekli</Text>
          <Text style={styles.guestDesc}>
            Konuşma akıcılığınızı ölçmek ve Beyin Sağlığı Endeksi'ne katkı sağlamak için ücretsiz hesap oluşturun.
          </Text>
          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.signupBtnText}>Hesap Oluştur</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Sesli Günlük</Text>
        <Text style={styles.subtitle}>Zihinsel akıcılık skoru</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          <View style={styles.typeRow}>
            {(Object.keys(PROMPT_META) as PromptType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={styles.typeEmoji}>{PROMPT_META[t].emoji}</Text>
                <Text style={[styles.typeLabel, selectedType === t && styles.typeLabelActive]}>
                  {PROMPT_META[t].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>{PROMPT_META[selectedType].desc}</Text>
          <Text style={styles.promptText}>{prompt}</Text>
          <TouchableOpacity onPress={() => fetchPrompt(selectedType)}>
            <Text style={styles.refreshPrompt}>Farklı soru →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordArea}>
          <View style={styles.waveform}>
            {Array.from({ length: 7 }, (_, i) => (
              <WaveBar key={i} active={isRecording} index={i} />
            ))}
          </View>

          <Text style={styles.timer}>{formatTime(elapsed)}</Text>

          {uploading ? (
            <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 12 }} />
          ) : (
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={isRecording ? stopAndUpload : startRecording}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="#fff" />
              <Text style={styles.recordBtnText}>
                {isRecording ? 'Bitir & Analiz Et' : 'Kaydı Başlat'}
              </Text>
            </TouchableOpacity>
          )}

          {!isRecording && !uploading && (
            <Text style={styles.hint}>En az 30 saniye konuşmanız önerilir</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/(tabs)/voice/history')}
        >
          <Ionicons name="time-outline" size={18} color={Colors.accent} />
          <Text style={styles.historyLinkText}>Geçmiş kayıtlarım</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, marginTop: 2 },
  typeScroll: { marginHorizontal: -20, marginBottom: 20 },
  typeRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  typeChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, gap: 4,
  },
  typeChipActive: { borderColor: Colors.accent, backgroundColor: '#F0FAFA' },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  typeLabelActive: { color: Colors.primary, fontWeight: '700' },
  promptCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24, gap: 8,
  },
  promptLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  promptText: { fontSize: 16, color: Colors.text, lineHeight: 24, fontWeight: '500' },
  refreshPrompt: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  recordArea: { alignItems: 'center', gap: 16 },
  waveform: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 70, backgroundColor: Colors.surface,
    borderRadius: 16, paddingHorizontal: 24, width: '100%', justifyContent: 'center',
  },
  waveBar: { width: 6, borderRadius: 3, minHeight: 4 },
  timer: { fontSize: 32, fontWeight: '700', color: Colors.text, letterSpacing: 2 },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 16,
  },
  recordBtnActive: { backgroundColor: Colors.error },
  recordBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16 },
  historyLinkText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
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
