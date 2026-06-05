import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface User {
  id: string
  email: string
  displayName: string
  mode: 'biohacker' | 'longevity'
  onboardingComplete: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isGuest: boolean
  isLoading: boolean
  setToken: (token: string, refreshToken?: string) => Promise<void>
  setUser: (user: User) => void
  setGuest: () => Promise<void>
  clearGuest: () => Promise<void>
  loadToken: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isGuest: false,
  isLoading: true,

  setToken: async (token, refreshToken) => {
    await SecureStore.setItemAsync('access_token', token)
    if (refreshToken) {
      await SecureStore.setItemAsync('refresh_token', refreshToken)
    }
    set({ token, isGuest: false })
  },

  setUser: (user) => set({ user }),

  setGuest: async () => {
    set({ isGuest: true, isLoading: false })
  },

  clearGuest: async () => {
    set({ isGuest: false })
  },

  loadToken: async () => {
    const token = await SecureStore.getItemAsync('access_token')

    if (token) {
      try {
        const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(`${BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          const userData = await res.json()
          set({
            token,
            isGuest: false,
            isLoading: false,
            user: {
              id: userData.id,
              email: userData.email,
              displayName: userData.displayName,
              mode: (userData.mode ?? 'longevity') as 'biohacker' | 'longevity',
              onboardingComplete: !!userData.profile?.onboardingComplete,
            },
          })
          return
        }
      } catch {
        // token geçersiz veya backend erişilemiyor
      }
    }

    set({ token: null, isGuest: false, isLoading: false })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    set({ token: null, user: null, isGuest: false })
  },
}))
