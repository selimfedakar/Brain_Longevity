import { query } from './client.js'

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       VARCHAR(64) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token)`)
  console.log('Migration complete: password_reset_tokens')
}

migrate().catch(console.error).finally(() => process.exit(0))
