export const Colors = {
  primary: '#1A1A2E',
  accent: '#4ECDC4',
  accentLight: '#A8E6E2',
  background: '#F5F3FF',
  surface: '#EDE9FF',
  border: '#D9D4F0',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
} as const

export const DarkColors = {
  primary: '#C8C8E8',
  accent: '#4ECDC4',
  accentLight: '#1A4F4C',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  border: '#2D2D45',
  text: '#E8E8F5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
} as const

export type AppColors = typeof Colors
