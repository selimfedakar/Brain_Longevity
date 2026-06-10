import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert,
 } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useApi } from '../../hooks/useApi'

type Step = 1 | 2 | 3

interface FormData {
  sex: 'male' | 'female' | 'other'
  cardiovascularRisk: number
  hasHearingLoss: boolean
  hasDiabetes: boolean
  hasHypertension: boolean
  socialIsolationScore: number
  educationYears: number
}

const EDUCATION_OPTIONS = [{ label: 'İlkokul', years: 5 }, { label: 'Ortaokul', years: 8 }, { label: 'Lise', years: 12 }, { label: 'Lisans', years: 16 }, { label: 'Lisansüstü', years: 18 }]

function calcAge(day: string, month: string, year: string): number | null {
  const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10)
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null
  const birth = new Date(y, m - 1, d)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [form, setForm] = useState<FormData>({
    sex: 'other',
    cardiovascularRisk: 2,
    hasHearingLoss: false,
    hasDiabetes: false,
    hasHypertension: false,
    socialIsolationScore: 3,
    educationYears: 16,
  })
  const { post } = useApi()

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const calculatedAge = calcAge(day, month, year)

  function birthDateError(): string | null {
    if (!day && !month && !year) return null
    if (!day || !month || !year) return null
    if (calculatedAge === null) return 'Geçerli bir doğum tarihi girin'
    if (calculatedAge < 18) return 'En az 18 yaşında olmanız gerekiyor'
    if (calculatedAge > 100) return 'Geçerli bir doğum tarihi girin'
    return null
  }

  function canProceedStep1() {
    return calculatedAge !== null && calculatedAge >= 18 && calculatedAge <= 100 && form.sex !== undefined
  }

  function birthDateISO(): string {
    const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  async function handleFinish() {
    setLoading(true)
    try {
      await post('/user/onboarding', {
        ...form,
        age: calculatedAge!,
        birthDate: birthDateISO(),
        disclaimerAccepted: true,
      })
      router.replace('/(tabs)')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      Alert.alert('Hata', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[styles.progressSegment, s <= step && styles.progressSegmentActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContent}>
            {/* Step header */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <View style={styles.stepHeaderText}>
                <Text style={styles.stepLabel}>Adım 1 / 3</Text>
                <Text style={styles.title}>Temel Bilgiler</Text>
              </View>
            </View>

            {/* Date picker card */}
            <View style={styles.card}>
              <Text style={styles.label}>Doğum Tarihi</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateFieldWrap}>
                  <TextInput
                    style={[styles.dateInput, birthDateError() ? styles.dateInputError : null]}
                    value={day}
                    onChangeText={t => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="GG"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    returnKeyType="next"
                  />
                  <Text style={styles.dateFieldLabel}>Gün</Text>
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={styles.dateFieldWrap}>
                  <TextInput
                    style={[styles.dateInput, birthDateError() ? styles.dateInputError : null]}
                    value={month}
                    onChangeText={t => setMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="AA"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    returnKeyType="next"
                  />
                  <Text style={styles.dateFieldLabel}>Ay</Text>
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={[styles.dateFieldWrap, styles.dateFieldYear]}>
                  <TextInput
                    style={[styles.dateInput, styles.dateInputYear, birthDateError() ? styles.dateInputError : null]}
                    value={year}
                    onChangeText={t => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="YYYY"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="done"
                  />
                  <Text style={styles.dateFieldLabel}>Yıl</Text>
                </View>
              </View>
              {birthDateError() && (
                <Text style={styles.fieldError}>{birthDateError()}</Text>
              )}
              {calculatedAge !== null && !birthDateError() && (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageBadgeText}>Yaşınız: {calculatedAge}</Text>
                </View>
              )}
            </View>

            {/* Sex chips card */}
            <View style={styles.card}>
              <Text style={styles.label}>Cinsiyet</Text>
              <View style={styles.chipRow}>
                {(['male', 'female', 'other'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, form.sex === s && styles.chipActive]}
                    onPress={() => update('sex', s)}
                  >
                    <Text style={[styles.chipText, form.sex === s && styles.chipTextActive]}>
                      {s === 'male' ? 'Erkek' : s === 'female' ? 'Kadın' : 'Diğer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Education chips card */}
            <View style={styles.card}>
              <Text style={styles.label}>Eğitim Durumu</Text>
              <View style={styles.chipRow}>
                {EDUCATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.years}
                    style={[styles.chip, styles.chipSm, form.educationYears === opt.years && styles.chipActive]}
                    onPress={() => update('educationYears', opt.years)}
                  >
                    <Text style={[styles.chipText, styles.chipTextSm, form.educationYears === opt.years && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            {/* Step header */}
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, styles.stepBadge2]}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <View style={styles.stepHeaderText}>
                <Text style={styles.stepLabel}>Adım 2 / 3</Text>
                <Text style={styles.title}>Sağlık Geçmişi</Text>
              </View>
            </View>

            <Text style={styles.hint}>Bu bilgiler programınızı kişiselleştirmek için kullanılır.</Text>

            {/* Toggle switches card */}
            <View style={styles.card}>
              {[
                { key: 'hasHearingLoss' as const, label: 'İşitme kaybı var mı?' },
                { key: 'hasDiabetes' as const, label: 'Diyabet teşhisi var mı?' },
                { key: 'hasHypertension' as const, label: 'Hipertansiyon var mı?' },
              ].map(({ key, label }, index, arr) => (
                <View key={key} style={[styles.switchRow, index === arr.length - 1 && styles.switchRowLast]}>
                  <Text style={styles.switchLabel}>{label}</Text>
                  <Switch
                    value={form[key]}
                    onValueChange={(v) => update(key, v)}
                    trackColor={{ false: Colors.border, true: Colors.accent }}
                    thumbColor={Colors.white}
                  />
                </View>
              ))}
            </View>

            {/* Cardiovascular risk card */}
            <View style={styles.card}>
              <Text style={styles.label}>Kardiyovasküler Risk</Text>
              <Text style={styles.hint}>1 = Düşük risk, 5 = Yüksek risk</Text>
              <View style={styles.chipRow}>
                {[1, 2, 3, 4, 5].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, styles.chipSq, form.cardiovascularRisk === r && styles.chipActive]}
                    onPress={() => update('cardiovascularRisk', r)}
                  >
                    <Text style={[styles.chipText, form.cardiovascularRisk === r && styles.chipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            {/* Step header */}
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, styles.stepBadge3]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <View style={styles.stepHeaderText}>
                <Text style={styles.stepLabel}>Adım 3 / 3</Text>
                <Text style={styles.title}>Feragatname</Text>
              </View>
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerTitle}>Önemli Bilgi</Text>
              <Text style={styles.disclaimerText}>
                BrainLongevity bir tıbbi cihaz veya teşhis aracı değildir. Bu uygulama:
                {'\n\n'}• FINGER, US POINTER ve benzer bilimsel araştırmalara dayanan yaşam tarzı
                takibini destekler.
                {'\n'}• Tıbbi teşhis, tedavi veya reçete koymaz.
                {'\n'}• Bilişsel gerileme veya hastalık hakkında kesin bir yargı vermez.
                {'\n'}• Doktorunuzun tavsiyelerinin yerine geçmez.
                {'\n\n'}Sağlık kararları için lütfen bir sağlık profesyoneliyle görüşün.
              </Text>
            </View>

            <Text style={styles.disclaimerFooter}>
              "Anladım" tuşuna basarak yukarıdaki koşulları okuduğunuzu ve kabul ettiğinizi
              onaylarsınız.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep((s) => (s - 1) as Step)}
          >
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            (loading || (step === 1 && !canProceedStep1())) && styles.buttonDisabled,
            step === 1 && styles.nextButtonFull,
          ]}
          onPress={step < 3 ? () => setStep((s) => (s + 1) as Step) : handleFinish}
          disabled={loading || (step === 1 && !canProceedStep1())}
        >
          <Text style={styles.nextButtonText}>
            {step < 3 ? 'Devam' : loading ? 'Kaydediliyor...' : 'Anladım, Başlayalım'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepContent: {
    gap: 16,
  },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressSegmentActive: {
    backgroundColor: Colors.accent,
  },

  // ── Step header ───────────────────────────────────────────────────────────
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge2: {
    backgroundColor: '#A78BFA',
  },
  stepBadge3: {
    backgroundColor: '#F59E0B',
  },
  stepBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  stepHeaderText: {
    gap: 1,
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 28,
  },

  // ── Card container ────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Field label ───────────────────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // ── Date picker ───────────────────────────────────────────────────────────
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  dateFieldWrap: {
    width: 52,
    alignItems: 'center',
    gap: 4,
  },
  dateFieldYear: {
    width: 74,
  },
  dateInput: {
    width: 52,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.surface,
    textAlign: 'center',
  },
  dateInputYear: {
    width: 74,
  },
  dateInputError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  dateFieldLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dateSep: {
    fontSize: 18,
    color: Colors.textMuted,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  ageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
  },
  fieldError: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '500',
  },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSq: {
    width: 44,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSm: {
    fontSize: 12,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── Switch rows ───────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    paddingRight: 12,
  },

  // ── Disclaimer ────────────────────────────────────────────────────────────
  disclaimerBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
  },
  disclaimerFooter: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 20,
    paddingHorizontal: 4,
  },

  // ── Footer buttons ────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
})
