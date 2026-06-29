'use client'

import { Marker } from 'react-map-gl/mapbox'
import type { CheckIn } from '@/lib/db'

export function CurrentLocationMarker({ checkIn }: { checkIn?: CheckIn }) {
  if (!checkIn) return null

  return (
    <Marker latitude={checkIn.lat} longitude={checkIn.lng} anchor="center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-40" />
        <div className="h-6 w-6 rounded-full border-3 border-white bg-blue-500 shadow-xl" />
      </div>
    </Marker>
  )
}
