import { z } from 'zod'

export const MetricTypeSchema = z.enum([
  'steps',
  'active_minutes_moderate',
  'active_minutes_vigorous',
  'deep_sleep_min',
  'rem_sleep_min',
  'total_sleep_min',
  'sleep_efficiency',
  'hrv_ms',
  'resting_heart_rate',
  'vo2_max',
  'systolic_bp',
  'diastolic_bp',
  'weight_kg',
])

export const IngestSingleSchema = z.object({
  metricType: MetricTypeSchema,
  value: z.number(),
  source: z.enum(['apple_health', 'google_fit', 'manual']).default('manual'),
  recordedAt: z.string().datetime(),
})

export const IngestBatchSchema = z.object({
  metrics: z.array(IngestSingleSchema).min(1).max(500),
})

export type IngestSingleInput = z.infer<typeof IngestSingleSchema>
