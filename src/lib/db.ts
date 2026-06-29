import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _client: NeonQueryFunction<false, false> | null = null

function getClient() {
  if (!_client) {
    if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not set')
    _client = neon(process.env.POSTGRES_URL, {
      fetchOptions: { cache: 'no-store' },
    })
  }
  return _client
}

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getClient()(strings, ...values)) as NeonQueryFunction<false, false>

export interface CheckIn {
  id: number
  lat: number
  lng: number
  place_name: string | null
  note: string | null
  country: string | null
  created_at: string
}

export interface GuestbookEntry {
  id: number
  check_in_id: number | null
  name: string | null
  message: string | null
  emoji: string | null
  created_at: string
}

export interface Photo {
  id: number
  blob_url: string
  lat: number
  lng: number
  caption: string | null
  created_at: string
}
