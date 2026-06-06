import { useState, useCallback } from 'react'
import { Platform } from 'react-native'
import { useApi } from './useApi'

// react-native-health types (iOS only)
type HealthValue = { value: number; startDate: string; endDate: string }

interface HealthKitModule {
  initHealthKit: (permissions: object, cb: (err: unknown, result: unknown) => void) => void
  getSleepSamples: (opts: object, cb: (err: unknown, results: HealthValue[]) => void) => void
  getDailyStepCountSamples: (opts: object, cb: (err: unknown, results: HealthValue[]) => void) => void
  getActiveEnergyBurned: (opts: object, cb: (err: unknown, results: HealthValue[]) => void) => void
  getHeartRateVariabilitySamples: (opts: object, cb: (err: unknown, results: HealthValue[]) => void) => void
}

function getAppleHealth(): HealthKitModule | null {
  if (Platform.OS !== 'ios') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health').default as HealthKitModule
  } catch {
    return null
  }
}

const PERMISSIONS = {
  permissions: {
    read: [
      'SleepAnalysis',
      'StepCount',
      'ActiveEnergyBurned',
      'HeartRateVariability',
      'RestingHeartRate',
      'Vo2Max',
      'BloodPressureSystolic',
      'BloodPressureDiastolic',
    ],
    write: [],
  },
}

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const { post } = useApi()

  const AppleHealth = getAppleHealth()

  const requestPermissions = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!AppleHealth) { resolve(false); return }
      AppleHealth.initHealthKit(PERMISSIONS, (err) => {
        if (err) { resolve(false); return }
        setAuthorized(true)
        resolve(true)
      })
    })
  }, [AppleHealth])

  function promisify<T>(
    fn: (opts: object, cb: (err: unknown, res: T) => void) => void,
    opts: object
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      fn(opts, (err, res) => (err ? reject(err) : resolve(res)))
    })
  }

  const syncToday = useCallback(async (): Promise<void> => {
    if (!AppleHealth) return
    setSyncing(true)

    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const opts = { startDate: startOfDay.toISOString(), endDate: today.toISOString() }

    const metrics: Array<{ metricType: string; value: number; source: string; recordedAt: string }> = []

    try {
      // Steps
      const steps = await promisify<HealthValue[]>(
        AppleHealth.getDailyStepCountSamples.bind(AppleHealth), opts
      )
      if (steps.length > 0) {
        const totalSteps = steps.reduce((s, v) => s + v.value, 0)
        metrics.push({ metricType: 'steps', value: totalSteps, source: 'apple_health', recordedAt: today.toISOString() })
      }

      // Active energy → approximate moderate minutes (1 kcal ≈ 0.18 min moderate)
      const energy = await promisify<HealthValue[]>(
        AppleHealth.getActiveEnergyBurned.bind(AppleHealth), opts
      )
      if (energy.length > 0) {
        const totalKcal = energy.reduce((s, v) => s + v.value, 0)
        const approxMinutes = Math.round(totalKcal / 5.5)
        metrics.push({ metricType: 'active_minutes_moderate', value: approxMinutes, source: 'apple_health', recordedAt: today.toISOString() })
      }

      // HRV
      const hrv = await promisify<HealthValue[]>(
        AppleHealth.getHeartRateVariabilitySamples.bind(AppleHealth), opts
      )
      if (hrv.length > 0) {
        const latest = hrv[hrv.length - 1]
        metrics.push({ metricType: 'hrv_ms', value: Math.round(latest.value * 1000), source: 'apple_health', recordedAt: latest.startDate })
      }

      // Sleep (yesterday night)
      const sleepStart = new Date(today)
      sleepStart.setDate(sleepStart.getDate() - 1)
      sleepStart.setHours(18, 0, 0, 0)
      const sleepSamples = await promisify<Array<HealthValue & { value: { HKCategoryValueSleepAnalysis: number } }>>(
        AppleHealth.getSleepSamples.bind(AppleHealth) as typeof AppleHealth.getSleepSamples,
        { startDate: sleepStart.toISOString(), endDate: today.toISOString() }
      ) as unknown as Array<{ startDate: string; endDate: string; value: string }>

      if (sleepSamples.length > 0) {
        let totalMin = 0, deepMin = 0, remMin = 0
        for (const s of sleepSamples) {
          const dur = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000
          totalMin += dur
          if (s.value === 'DEEP') deepMin += dur
          if (s.value === 'REM') remMin += dur
        }
        if (totalMin > 0) {
          const recordedAt = sleepSamples[0].endDate
          metrics.push({ metricType: 'total_sleep_min', value: Math.round(totalMin), source: 'apple_health', recordedAt })
          if (deepMin > 0) metrics.push({ metricType: 'deep_sleep_min', value: Math.round(deepMin), source: 'apple_health', recordedAt })
          if (remMin > 0) metrics.push({ metricType: 'rem_sleep_min', value: Math.round(remMin), source: 'apple_health', recordedAt })
        }
      }

      if (metrics.length > 0) {
        await post('/health/ingest/batch', { metrics })
        setLastSyncAt(new Date().toISOString())
      }
    } catch (err) {
      console.warn('HealthKit sync error:', err)
    } finally {
      setSyncing(false)
    }
  }, [AppleHealth, post])

  return {
    isAvailable: Platform.OS === 'ios' && !!AppleHealth,
    authorized,
    syncing,
    lastSyncAt,
    requestPermissions,
    syncToday,
  }
}
