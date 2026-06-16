import { useColorScheme } from 'react-native'

export function useTheme() {
  const scheme = useColorScheme()
  return {
    isDark: scheme === 'dark',
    scheme,
  }
}
