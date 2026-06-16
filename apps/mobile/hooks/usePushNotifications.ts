import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { useAuthStore } from '../store/auth'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId

  if (!projectId) return null

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    return token
  } catch {
    return null
  }
}

export function usePushNotifications() {
  const { token: authToken, isGuest } = useAuthStore()

  useEffect(() => {
    if (isGuest || !authToken) return

    registerForPushNotifications().then(async (pushToken) => {
      if (!pushToken) return
      try {
        await fetch(`${BASE_URL}/push/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ token: pushToken, platform: 'ios' }),
        })
      } catch { /* non-critical */ }
    })
  }, [authToken, isGuest])
}
