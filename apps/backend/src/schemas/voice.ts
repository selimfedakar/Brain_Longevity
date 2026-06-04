import { z } from 'zod'

export const PromptTypeSchema = z.enum([
  'image_narration',
  'story_recall',
  'free_journal',
  'word_association',
])

export type PromptType = z.infer<typeof PromptTypeSchema>

export const PROMPTS: Record<PromptType, string[]> = {
  image_narration: [
    'Çocukluğunuzdan bir sahneyi hayal edin ve tarif edin.',
    'Gözlerinizi kapatın, en sevdiğiniz yeri hayal edin ve anlatın.',
    'Bir sonbahar parkını aklınızda canlandırın ve betimleyin.',
  ],
  story_recall: [
    'Bu sabah evden çıkmadan ne yaptınız? Adım adım anlatın.',
    'Geçen hafta yaptığınız en keyifli şeyi anlatın.',
    'Son okuduğunuz kitap veya izlediğiniz filmi özetleyin.',
  ],
  free_journal: [
    'Bugün nasıl hissediyorsunuz? Aklınıza ne geliyor?',
    'Bu hafta için kendinize ne diliyorsunuz?',
    'Şu an hayatınızda neye minnetdarsınız?',
  ],
  word_association: [
    '"Deniz" kelimesini duyduğunuzda aklınıza gelen her şeyi anlatın.',
    '"Ev" kelimesiyle bağlantılı tüm düşüncelerinizi paylaşın.',
    '"Sabah" kelimesi size ne hissettiriyor? Her şeyi söyleyin.',
  ],
}
