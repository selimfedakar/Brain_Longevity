export type Domain =
  | 'attention'
  | 'working_memory'
  | 'processing_speed'
  | 'multitasking'
  | 'spatial'
  | 'executive_function'

export interface GameDefinition {
  type: string
  difficultyRating: number
}

export const K_FACTOR = 32
export const ACCURACY_CEILING = 92
export const ACCURACY_FLOOR = 55
export const STRETCH_FACTOR = 75

export const TARGET_RESPONSE_TIMES: Record<Domain, number> = {
  attention: 600,
  working_memory: 1200,
  processing_speed: 400,
  multitasking: 1500,
  spatial: 2000,
  executive_function: 1800,
}

export const GAMES_BY_DOMAIN: Record<Domain, GameDefinition[]> = {
  working_memory: [
    { type: 'n_back_1', difficultyRating: 800 },
    { type: 'n_back_2', difficultyRating: 1000 },
    { type: 'n_back_3', difficultyRating: 1200 },
    { type: 'n_back_4', difficultyRating: 1400 },
    { type: 'digit_span_forward', difficultyRating: 850 },
    { type: 'digit_span_backward', difficultyRating: 1100 },
  ],
  attention: [
    { type: 'stroop_classic', difficultyRating: 900 },
    { type: 'stroop_complex', difficultyRating: 1150 },
    { type: 'flanker_congruent', difficultyRating: 800 },
    { type: 'flanker_incongruent', difficultyRating: 1050 },
    { type: 'sustained_vigilance', difficultyRating: 1000 },
  ],
  processing_speed: [
    { type: 'symbol_match', difficultyRating: 850 },
    { type: 'trail_making_a', difficultyRating: 900 },
    { type: 'trail_making_b', difficultyRating: 1200 },
    { type: 'digit_symbol', difficultyRating: 1000 },
  ],
  multitasking: [
    { type: 'dual_task_easy', difficultyRating: 1000 },
    { type: 'dual_task_medium', difficultyRating: 1200 },
    { type: 'dual_task_hard', difficultyRating: 1500 },
  ],
  spatial: [
    { type: 'mental_rotation_2d', difficultyRating: 900 },
    { type: 'mental_rotation_3d', difficultyRating: 1200 },
    { type: 'spatial_span', difficultyRating: 1050 },
    { type: 'wayfinding', difficultyRating: 1300 },
  ],
  executive_function: [
    { type: 'task_switching_easy', difficultyRating: 950 },
    { type: 'task_switching_hard', difficultyRating: 1250 },
    { type: 'inhibition_go_nogo', difficultyRating: 1000 },
  ],
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function calculatePerformanceScore(
  accuracy: number,
  responseMs: number,
  domain: Domain
): number {
  const targetMs = TARGET_RESPONSE_TIMES[domain]
  const speedRatio = targetMs / responseMs
  const speedScore = clamp(speedRatio * 100, 0, 100)
  return accuracy * 0.7 + speedScore * 0.3
}

export function updateELO(
  userELO: number,
  gameELO: number,
  performanceScore: number
): { newELO: number; delta: number } {
  const expected = 1 / (1 + Math.pow(10, (gameELO - userELO) / 400))
  const actual = performanceScore / 100
  const delta = Math.round(K_FACTOR * (actual - expected))
  return { newELO: userELO + delta, delta }
}

export function selectNextGame(
  userELO: number,
  domain: Domain,
  recentGameTypes: string[]
): GameDefinition {
  const targetDifficulty = userELO + STRETCH_FACTOR + randomBetween(-30, 30)
  const available = GAMES_BY_DOMAIN[domain].filter(
    (game) => !recentGameTypes.slice(-3).includes(game.type)
  )
  const pool = available.length > 0 ? available : GAMES_BY_DOMAIN[domain]
  return pool.reduce((best, game) =>
    Math.abs(game.difficultyRating - targetDifficulty) <
    Math.abs(best.difficultyRating - targetDifficulty)
      ? game
      : best
  )
}
