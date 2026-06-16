import { useColorScheme } from 'react-native'
import { Colors, DarkColors } from '../constants/colors'

export function useThemeColors() {
  const scheme = useColorScheme()
  return scheme === 'dark' ? DarkColors : Colors
}
