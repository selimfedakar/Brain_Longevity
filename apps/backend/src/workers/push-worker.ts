import { Worker, Queue } from 'bullmq'
import { config } from '../config.js'
import { query } from '../db/client.js'

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname, port: parseInt(u.port || '6379', 10), password: u.password || undefined }
  } catch {
    return { host: '127.0.0.1', port: 6379 }
  }
}

const connection = parseRedisUrl(config.redisUrl)

export const pushQueue = new Queue('push-reminders', { connection })

export function startPushWorker() {
  const worker = new Worker(
    'push-reminders',
    async (job) => {
      const { userId } = job.data as { userId: string }

      // Check if user was active today — if so, skip notification
      const today = new Date().toISOString().split('T')[0]
      const { rows: activeRows } = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM cognitive_sessions
         WHERE user_id = $1 AND DATE(created_at) = $2`,
        [userId, today]
      )
      if (parseInt(activeRows[0].count) > 0) return { skipped: true }

      // Get user's push tokens
      const { rows: tokenRows } = await query<{ token: string }>(
        'SELECT token FROM push_tokens WHERE user_id = $1',
        [userId]
      )
      if (tokenRows.length === 0) return { skipped: true }

      // Send via Expo Push API
      const messages = tokenRows.map(r => ({
        to: r.token,
        title: '🧠 Bugünkü Antrenman',
        body: 'Beyin sağlığı hedeflerine ulaşmak için bugün birkaç dakika ayır.',
        sound: 'default',
        data: { screen: 'cognitive' },
      }))

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(messages),
      })

      return { sent: messages.length }
    },
    { connection, concurrency: 20 }
  )

  worker.on('failed', (job, err) => {
    console.error(`Push job failed for ${job?.data.userId}:`, err.message)
  })

  return worker
}

// Enqueue daily reminders for all users with push tokens (~8 PM)
export async function enqueueDailyReminders() {
  const { rows } = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM push_tokens`
  )

  for (const row of rows) {
    await pushQueue.add(
      'daily-reminder',
      { userId: row.user_id },
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 } }
    )
  }

  console.log(`Enqueued push reminders for ${rows.length} users`)
}
