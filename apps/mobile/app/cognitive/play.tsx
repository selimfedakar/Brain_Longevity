import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../hooks/useApi'
import { Colors } from '../../constants/colors'

interface NextGameResponse {
  domain: string
  userELO: number
  nextGame: { type: string; difficultyRating: number }
}

const GAME_ROUTES: Record<string, string> = {
  stroop_classic: '/cognitive/games/stroop',
  stroop_complex: '/cognitive/games/stroop',
  flanker_congruent: '/cognitive/games/flanker',
  flanker_incongruent: '/cognitive/games/flanker',
  n_back_1: '/cognitive/games/nback',
  n_back_2: '/cognitive/games/nback',
  n_back_3: '/cognitive/games/nback',
  n_back_4: '/cognitive/games/nback',
  trail_making_a: '/cognitive/games/trail',
  trail_making_b: '/cognitive/games/trail',
  digit_span_forward: '/cognitive/games/nback',
  digit_span_backward: '/cognitive/games/nback',
  symbol_match: '/cognitive/games/speed',
  digit_symbol: '/cognitive/games/speed',
  dual_task_easy: '/cognitive/games/multitask',
  dual_task_medium: '/cognitive/games/multitask',
  dual_task_hard: '/cognitive/games/multitask',
  spatial_span: '/cognitive/games/spatial',
  mental_rotation_2d: '/cognitive/games/spatial',
  mental_rotation_3d: '/cognitive/games/spatial',
}

export default function PlayScreen() {
  const { domain } = useLocalSearchParams<{ domain: string }>()
  const { get } = useApi()

  const { data, isSuccess, isError } = useQuery<NextGameResponse>({
    queryKey: ['next-game', domain],
    queryFn: () => get(`/cognitive/next-game?domain=${domain}`),
    retry: false,
  })

  useEffect(() => {
    if (isSuccess && data) {
      const route = GAME_ROUTES[data.nextGame.type]
      if (route) {
        router.replace({
          pathname: route as never,
          params: {
            gameType: data.nextGame.type,
            domain: data.domain,
            difficulty: data.nextGame.difficultyRating,
            userELO: data.userELO,
          },
        })
      }
    }
    if (isError) {
      // Fallback: route based on domain
      const fallbacks: Record<string, { route: string; gameType: string }> = {
        attention:          { route: '/cognitive/games/stroop',    gameType: 'stroop_classic' },
        working_memory:     { route: '/cognitive/games/nback',     gameType: 'n_back_2' },
        processing_speed:   { route: '/cognitive/games/speed',     gameType: 'symbol_match' },
        multitasking:       { route: '/cognitive/games/multitask', gameType: 'dual_task_easy' },
        spatial:            { route: '/cognitive/games/spatial',   gameType: 'spatial_span' },
        executive_function: { route: '/cognitive/games/trail',     gameType: 'trail_making_a' },
      }
      const fb = fallbacks[domain ?? 'attention'] ?? fallbacks.attention
      router.replace({
        pathname: fb.route as never,
        params: { gameType: fb.gameType, domain: domain ?? 'attention', difficulty: 1000, userELO: 1000 },
      })
    }
  }, [isSuccess, isError, data])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
})
