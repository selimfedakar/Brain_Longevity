import { z } from 'zod'

export const AcceptInviteSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  relationship: z.enum(['spouse', 'child', 'sibling', 'professional', 'friend']),
})
