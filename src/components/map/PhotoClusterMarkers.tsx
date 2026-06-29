'use client'

import { Marker } from 'react-map-gl/mapbox'
import { Camera } from 'lucide-react'
import type { PhotoCluster } from '@/lib/geo'

interface Props {
  clusters: PhotoCluster[]
  onSelect: (cluster: PhotoCluster) => void
}

export function PhotoClusterMarkers({ clusters, onSelect }: Props) {
  return (
    <>
      {clusters.map((cluster, i) => (
        <Marker
          key={i}
          latitude={cluster.lat}
          longitude={cluster.lng}
          anchor="center"
          onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
            e.originalEvent.stopPropagation()
            onSelect(cluster)
          }}
        >
          <button className="flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-md transition-transform hover:scale-110 active:scale-95">
            <Camera className="h-3.5 w-3.5 text-gray-700" />
            {cluster.photos.length > 1 && (
              <span className="text-xs font-semibold text-gray-800">{cluster.photos.length}</span>
            )}
          </button>
        </Marker>
      ))}
    </>
  )
}
