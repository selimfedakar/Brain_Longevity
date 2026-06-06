import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../store/auth'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    if (!refreshToken) return null

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null

    const data = await res.json()
    await useAuthStore.getState().setToken(data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

export function useApi() {
  async function authFetch(path: string, init: RequestInit): Promise<Response> {
    const token = useAuthStore.getState().token
    const reqInit: RequestInit = {
      ...init,
      headers: {
        ...((init.headers as Record<string, string>) ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }

    let res = await fetch(`${BASE_URL}${path}`, reqInit)

    if (res.status === 401) {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        await useAuthStore.getState().logout()
        throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.')
      }
      const retryInit: RequestInit = {
        ...init,
        headers: {
          ...((init.headers as Record<string, string>) ?? {}),
          Authorization: `Bearer ${newToken}`,
        },
      }
      res = await fetch(`${BASE_URL}${path}`, retryInit)
    }

    return res
  }

  const jsonHeaders = (): Record<string, string> => ({ 'Content-Type': 'application/json' })

  async function get<T>(path: string): Promise<T> {
    const res = await authFetch(path, { headers: jsonHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data as T
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await authFetch(path, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data as T
  }

  async function put<T>(path: string, body: unknown): Promise<T> {
    const res = await authFetch(path, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data as T
  }

  async function del<T>(path: string): Promise<T> {
    const res = await authFetch(path, {
      method: 'DELETE',
      headers: jsonHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')
    return data as T
  }

  async function upload<T>(path: string, formData: FormData): Promise<T> {
    const token = useAuthStore.getState().token

    let res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (res.status === 401) {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        await useAuthStore.getState().logout()
        throw new Error('Oturum süresi doldu.')
      }
      res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${newToken}` },
        body: formData,
      })
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    return data as T
  }

  return { get, post, put, del, upload }
}
