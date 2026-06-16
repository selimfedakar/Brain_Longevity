import { query } from './client.js'

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      platform   VARCHAR(10) NOT NULL DEFAULT 'ios',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id)`)
  console.log('Migration complete: push_tokens')
}

migrate().catch(console.error).finally(() => process.exit(0))
