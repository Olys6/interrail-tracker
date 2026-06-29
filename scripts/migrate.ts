import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.POSTGRES_URL!)

async function migrate() {
  console.log('Running migrations…')

  await sql`
    CREATE TABLE IF NOT EXISTS check_ins (
      id         SERIAL PRIMARY KEY,
      lat        DOUBLE PRECISION NOT NULL,
      lng        DOUBLE PRECISION NOT NULL,
      place_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id         SERIAL PRIMARY KEY,
      blob_url   TEXT NOT NULL,
      lat        DOUBLE PRECISION NOT NULL,
      lng        DOUBLE PRECISION NOT NULL,
      caption    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS check_ins_created_at_idx ON check_ins (created_at ASC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos (created_at DESC)
  `

  console.log('Migrations complete.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
