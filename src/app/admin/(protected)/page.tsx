import { sql } from '@/lib/db'
import type { CheckIn, Photo } from '@/lib/db'
import { CheckInButton } from '@/components/admin/CheckInButton'
import { CheckInList } from '@/components/admin/CheckInList'
import { PhotoUploadForm } from '@/components/admin/PhotoUploadForm'
import { PhotoGrid } from '@/components/admin/PhotoGrid'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { MapPin, Camera } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const [checkIns, photos] = await Promise.all([
    sql`SELECT * FROM check_ins ORDER BY created_at ASC` as unknown as Promise<CheckIn[]>,
    sql`SELECT * FROM photos ORDER BY created_at DESC` as unknown as Promise<Photo[]>,
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-sm font-bold text-gray-900">Trip Admin</h1>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              Public map
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 sm:p-4">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {/* Check-ins panel */}
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900">Location Check-In</h2>
            </div>
            <CheckInButton />
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                History ({checkIns.length})
              </p>
              <CheckInList checkIns={checkIns} />
            </div>
          </div>

          {/* Photos panel */}
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-900">Upload Photos</h2>
            </div>
            <PhotoUploadForm />
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Gallery ({photos.length})
              </p>
              <PhotoGrid photos={photos} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
