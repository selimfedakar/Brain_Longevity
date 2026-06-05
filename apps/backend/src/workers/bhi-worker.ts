import { Worker, Queue } from 'bullmq'
import { config } from '../config.js'
import { query } from '../db/client.js'
import { computeBrainHealthIndex } from '../lib/health-scores.js'

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname, port: parseInt(u.port || '6379', 10), password: u.password || undefined }
  } catch {
    return { host: '127.0.0.1', port: 6379 }
  }
}

const connection = parseRedisUrl(config.redisUrl)

export const bhiQueue = new Queue('bhi-nightly', { connection })

export function startBHIWorker() {
  const worker = new Worker(
    'bhi-nightly',
    async (job) => {
      const { userId, date } = job.data as { userId: string; date: string }
      const composite = await computeBrainHealthIndex(userId, date)
      return { userId, date, composite }
    },
    { connection, concurrency: 10 }
  )

  worker.on('completed', (job) => {
    console.log(`BHI computed for ${job.data.userId} on ${job.data.date}: ${job.returnvalue?.composite}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`BHI job failed for ${job?.data.userId}:`, err.message)
  })

  return worker
}

// Tüm aktif kullanıcılar için nightly BHI kuyruğu doldur
export async function enqueueBHIForAllUsers(date: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE last_active >= NOW() - INTERVAL '30 days'`
  )

  for (const user of rows) {
    await bhiQueue.add(
      'compute',
      { userId: user.id, date },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }

  console.log(`Enqueued BHI for ${rows.length} users on ${date}`)
}
