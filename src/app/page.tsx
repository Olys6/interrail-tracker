import dynamicImport from 'next/dynamic'
import { getCheckIns, getPhotos } from '@/lib/db'
import type { CheckIn, Photo } from '@/lib/db'
import { StatsBanner } from '@/components/map/StatsBanner'

export const dynamic = 'force-dynamic'

const TripView = dynamicImport(
  () => import('@/components/map/TripView').then((m) => m.TripView),
  { ssr: false, loading: () => <div className="h-screen w-full animate-pulse bg-gray-100" /> }
)

export default async function HomePage() {
  let checkIns: CheckIn[]
  let photos: Photo[]
  try {
    ;[checkIns, photos] = await Promise.all([getCheckIns(), getPhotos()])
  } catch {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center">
          <p className="text-4xl">🚂💤</p>
          <h1 className="mt-3 text-lg font-bold text-gray-900">Trip map is taking a nap</h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn&apos;t reach the database just now — this is usually temporary. Try
            refreshing in a few minutes.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative">
      <TripView initialCheckIns={checkIns} photos={photos} />
      <div className="absolute left-3 top-3 z-10 max-w-[70vw] rounded-xl bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:left-4 sm:top-4 sm:max-w-none sm:px-4 sm:py-3">
        <h1 className="text-sm font-bold text-gray-900">Oliver&apos;s Interrail Trip</h1>
        {checkIns.length > 0 ? (
          <StatsBanner checkIns={checkIns} photos={photos} />
        ) : (
          <p className="mt-0.5 text-xs text-gray-500">Trip hasn&apos;t started yet</p>
        )}
      </div>
    </main>
  )
}
