import { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'
import { Colors } from '../../constants/colors'
import { useAuthStore } from '../../store/auth'

const PASTEL_PURPLE = '#E8E0FF'
const PASTEL_MINT = '#C8F0EE'
const PASTEL_LAVENDER = '#EDE8FF'
const RESEARCH_BG = '#E0F7F5'

const features = [
  { icon: '🔬', text: 'Kanıta Dayalı' },
  { icon: '🧩', text: '6 Alan' },
  { icon: '📈', text: 'ELO Sistemi' },
]

function useFadeIn(delay: number) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(40)
  const scale = useSharedValue(0.92)
  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, { damping: 16, stiffness: 120 }))
    translateY.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 120 }))
    scale.value = withDelay(delay, withSpring(1, { damping: 16, stiffness: 120 }))
  }, [])
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))
}

function usePulse() {
  const scale = useSharedValue(1)
  useEffect(() => {
    scale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1800 }),
          withTiming(1.0, { duration: 1800 }),
        ),
        -1,
        true,
      ),
    )
  }, [])
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
}

function useButtonPulse() {
  const scale = useSharedValue(1)
  useEffect(() => {
    scale.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200 }),
          withTiming(1.0, { duration: 1200 }),
        ),
        -1,
        true,
      ),
    )
  }, [])
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
}

function useBlobFloat(delay: number, amplitude: number = 8) {
  const y = useSharedValue(0)
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(amplitude, { duration: 2500 }),
          withTiming(-amplitude, { duration: 2500 }),
        ),
        -1,
        true,
      ),
    )
  }, [])
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
}

export default function WelcomeScreen() {
  const { setGuest } = useAuthStore()
  const anim0 = useFadeIn(0)
  const anim1 = useFadeIn(100)
  const anim2 = useFadeIn(200)
  const anim3 = useFadeIn(300)
  const anim4 = useFadeIn(400)
  const anim5 = useFadeIn(500)
  const pulseAnim = usePulse()
  const buttonPulse = useButtonPulse()
  const blob1Anim = useBlobFloat(0, 10)
  const blob2Anim = useBlobFloat(400, 7)
  const blob3Anim = useBlobFloat(800, 5)

  async function handleGuest() {
    await setGuest()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.decorBlob1, blob1Anim]} />
        <Animated.View style={[styles.decorBlob2, blob2Anim]} />
        <Animated.View style={[styles.decorBlob3, blob3Anim]} />

        <View style={styles.heroSection}>
          <Animated.View style={[styles.iconCard, anim0, pulseAnim]}>
            <Text style={styles.iconEmoji}>🧠</Text>
          </Animated.View>

          <Animated.View style={anim1}>
            <Text style={styles.title}>BrainLongevity</Text>
          </Animated.View>

          <Animated.View style={anim2}>
            <Text style={styles.subtitle}>Beyin sağlığınızı bilimle koruyun</Text>
          </Animated.View>

          <Animated.View style={[styles.featuresRow, anim3]}>
            {features.map((f, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipIcon}>{f.icon}</Text>
                <Text style={styles.chipText}>{f.text}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.researchBox, anim4]}>
            <View style={styles.researchAccent} />
            <View style={styles.researchInner}>
              <Text style={styles.researchTitle}>📚 FINGER & US POINTER Araştırması</Text>
              <Text style={styles.researchBody}>
                Bilişsel gerilemeyi önlemenin kanıtlanmış 5 yolu: bilişsel antrenman, MIND diyeti,
                egzersiz, uyku kalitesi ve zihinsel akıcılık.
              </Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.actionsSection, anim5]}>
          <Animated.View style={buttonPulse}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.primaryButtonText}>Başla</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.guestButton} activeOpacity={0.7} onPress={handleGuest}>
            <Text style={styles.guestButtonText}>Misafir Olarak Devam Et</Text>
            <Text style={styles.guestDisclaimer}>
              Verileriniz bu cihazda saklanır, bulut yedeklemesi olmaz
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 44,
  },

  decorBlob1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: PASTEL_PURPLE,
    opacity: 0.70,
  },
  decorBlob2: {
    position: 'absolute',
    top: 130,
    left: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: PASTEL_MINT,
    opacity: 0.65,
  },
  decorBlob3: {
    position: 'absolute',
    top: 340,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: PASTEL_LAVENDER,
    opacity: 0.55,
  },

  heroSection: {
    alignItems: 'center',
    gap: 20,
    marginBottom: 36,
  },

  iconCard: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: '#EDE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#7C5CBF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconEmoji: {
    fontSize: 60,
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  featuresRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: PASTEL_LAVENDER,
  },
  chipIcon: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  researchBox: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: RESEARCH_BG,
    overflow: 'hidden',
    marginTop: 4,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  researchAccent: {
    width: 4,
    backgroundColor: Colors.accent,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  researchInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  researchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  researchBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  actionsSection: {
    gap: 12,
  },

  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  secondaryButton: {
    backgroundColor: Colors.white,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  guestButton: {
    alignItems: 'center',
    paddingTop: 10,
    gap: 5,
  },
  guestButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  guestDisclaimer: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
})
