import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrateSocial() {
  const sql = readFileSync(join(__dirname, 'schema_social.sql'), 'utf-8')
  console.log('Running social schema migration...')
  await pool.query(sql)
  console.log('Social migration complete.')
  await pool.end()
}

migrateSocial().catch((err) => {
  console.error('Social migration failed:', err)
  process.exit(1)
})
