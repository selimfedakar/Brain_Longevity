import { Stack } from 'expo-router'
import { Colors } from '../../constants/colors'

export default function CaregiverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    />
  )
}
