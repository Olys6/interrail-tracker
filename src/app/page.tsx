import dynamicImport from 'next/dynamic'
import { sql } from '@/lib/db'
import type { CheckIn, Photo } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TripView = dynamicImport(
  () => import('@/components/map/TripView').then((m) => m.TripView),
  { ssr: false, loading: () => <div className="h-screen w-full animate-pulse bg-gray-100" /> }
)

export default async function HomePage() {
  const [checkIns, photos] = await Promise.all([
    sql`SELECT * FROM check_ins ORDER BY created_at ASC` as unknown as Promise<CheckIn[]>,
    sql`SELECT * FROM photos ORDER BY created_at DESC` as unknown as Promise<Photo[]>,
  ])

  return (
    <main className="relative">
      <TripView initialCheckIns={checkIns} photos={photos} />
      <div className="absolute left-3 top-3 z-10 max-w-[55vw] rounded-xl bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:left-4 sm:top-4 sm:max-w-none sm:px-4 sm:py-3">
        <h1 className="text-sm font-bold text-gray-900">Oliver&apos;s Interrail Trip</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          {checkIns.length > 0
            ? `${checkIns.length} stop${checkIns.length !== 1 ? 's' : ''} · ${photos.length} photo${photos.length !== 1 ? 's' : ''}`
            : "Trip hasn't started yet"}
        </p>
      </div>
    </main>
  )
}
