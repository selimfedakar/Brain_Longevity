import { z } from 'zod'

export const SubmitSessionSchema = z.object({
  gameType: z.string().min(1),
  domain: z.enum([
    'attention',
    'working_memory',
    'processing_speed',
    'multitasking',
    'spatial',
    'executive_function',
  ]),
  totalTrials: z.number().int().min(1),
  correctTrials: z.number().int().min(0),
  avgResponseMs: z.number().int().min(0),
  difficultyRating: z.number().int().min(100).max(2000),
})

export const NextGameQuerySchema = z.object({
  domain: z.enum([
    'attention',
    'working_memory',
    'processing_speed',
    'multitasking',
    'spatial',
    'executive_function',
  ]),
})

export type SubmitSessionInput = z.infer<typeof SubmitSessionSchema>
