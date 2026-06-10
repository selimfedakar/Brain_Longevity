import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          height: 84,
          paddingBottom: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="cognitive" options={{ href: null }} />
      <Tabs.Screen
        name="articles"
        options={{
          title: 'Bilim',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flask-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: 'Diyet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Günlük',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Sosyal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="voice/history" options={{ href: null }} />
      <Tabs.Screen name="voice/result" options={{ href: null }} />
      <Tabs.Screen name="diet/weekly" options={{ href: null }} />
      <Tabs.Screen name="social/challenges" options={{ href: null }} />
      <Tabs.Screen name="articles/[id]" options={{ href: null }} />
    </Tabs>
  )
}
