'use client'

import { useState, useEffect, useCallback } from 'react'
import { List, X } from 'lucide-react'
import { TripMap } from './TripMap'
import { Sidebar } from './Sidebar'
import type { CheckIn, Photo } from '@/lib/db'
import type { PhotoCluster } from '@/lib/geo'

interface Props {
  initialCheckIns: CheckIn[]
  photos: Photo[]
}

export function TripView({ initialCheckIns, photos }: Props) {
  const [checkIns, setCheckIns] = useState(initialCheckIns)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<PhotoCluster | null>(null)

  const fetchCheckIns = useCallback(async () => {
    try {
      const res = await fetch('/api/check-ins')
      if (res.ok) setCheckIns(await res.json())
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    fetchCheckIns()
    const interval = setInterval(fetchCheckIns, 60000)
    return () => clearInterval(interval)
  }, [fetchCheckIns])

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyToTarget({ lat, lng })
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <TripMap
        checkIns={checkIns}
        photos={photos}
        flyToTarget={flyToTarget}
        selectedCluster={selectedCluster}
        onSelectCluster={setSelectedCluster}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        checkIns={checkIns}
        photos={photos}
        onFlyTo={handleFlyTo}
        onSelectCluster={setSelectedCluster}
      />

      {/* Browse toggle — bottom-centre on mobile, right-middle on desktop */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Close browser' : 'Open browser'}
        className={`
          absolute z-30 flex items-center gap-2 rounded-full bg-white shadow-lg
          font-medium text-gray-700 transition-all hover:bg-gray-50
          /* mobile: bottom centre pill */
          bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 text-sm
          /* desktop: right side tab, moves with sidebar */
          sm:bottom-auto sm:left-auto sm:translate-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-3 sm:py-2 sm:text-sm
          ${sidebarOpen ? 'sm:right-[336px]' : 'sm:right-4'}
        `}
        style={{ transition: 'right 0.3s ease-in-out' }}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
        <span>{sidebarOpen ? 'Close' : 'Browse'}</span>
      </button>
    </div>
  )
}
