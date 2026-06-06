import { Redirect } from 'expo-router'
import { useAuthStore } from '../store/auth'

export default function Index() {
  const { token, user, isGuest, isLoading } = useAuthStore()

  if (isLoading) return null

  if (token && user && !user.onboardingComplete) {
    return <Redirect href="/(onboarding)" />
  }

  if (token && !user) {
    return <Redirect href="/(auth)/welcome" />
  }

  return (token && user?.onboardingComplete) || isGuest ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/welcome" />
}
