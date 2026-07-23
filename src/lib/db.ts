import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { unstable_cache } from 'next/cache'

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

// Cached reads for the hot paths (public map polling, OG image crawlers).
// Short revalidate window so concurrent visitors share one DB round trip
// instead of each triggering a fresh Neon compute wake-up; mutations call
// revalidateTag(...) to invalidate immediately.
export const getCheckIns = unstable_cache(
  async () => (await sql`SELECT * FROM check_ins ORDER BY created_at ASC`) as CheckIn[],
  ['check-ins'],
  { tags: ['check-ins'], revalidate: 30 }
)

export const getPhotos = unstable_cache(
  async () => (await sql`SELECT * FROM photos ORDER BY created_at DESC`) as Photo[],
  ['photos'],
  { tags: ['photos'], revalidate: 30 }
)

export const getTripStats = unstable_cache(
  async () => {
    const [latestCheckIn, stopCount, photoCount] = await Promise.all([
      sql`SELECT place_name FROM check_ins ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT COUNT(*)::int AS count FROM check_ins`,
      sql`SELECT COUNT(*)::int AS count FROM photos`,
    ])
    return {
      latestPlaceName: (latestCheckIn[0]?.place_name as string | null | undefined) ?? null,
      hasCheckIns: latestCheckIn.length > 0,
      stops: (stopCount[0]?.count as number) ?? 0,
      photos: (photoCount[0]?.count as number) ?? 0,
    }
  },
  ['trip-stats'],
  { tags: ['check-ins', 'photos'], revalidate: 60 }
)
