import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const pool = new Pool({ connectionString: config.databaseUrl })

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err)
  process.exit(1)
})

export async function query<T extends pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params)
}

export async function getClient() {
  return pool.connect()
}
