import { z } from 'zod'

export const FoodCategorySchema = z.enum([
  // Pozitif (beyin dostu)
  'leafy_greens', 'other_vegetables', 'nuts', 'berries',
  'beans', 'whole_grains', 'fish', 'poultry', 'olive_oil', 'wine',
  // Negatif (kaçınılacak)
  'red_meat', 'butter_margarine', 'cheese', 'pastries_sweets', 'fried_fast_food',
])

export const NEGATIVE_CATEGORIES = new Set([
  'red_meat', 'butter_margarine', 'cheese', 'pastries_sweets', 'fried_fast_food',
])

export const LogDietSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(
    z.object({
      foodCategory: FoodCategorySchema,
      servings: z.number().min(0.5).max(10),
    })
  ).min(1).max(15),
})

export type LogDietInput = z.infer<typeof LogDietSchema>
