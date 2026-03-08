/**
 * Conexión a PostgreSQL (modo standalone, sin Supabase)
 */
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

let pool: Pool | null = null

export function getDb(): Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL no configurada')
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export function isStandaloneMode(): boolean {
  return !!process.env.DATABASE_URL
}
