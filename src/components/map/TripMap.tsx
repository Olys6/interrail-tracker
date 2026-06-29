'use client'

import { useMemo, useEffect, useRef, useCallback } from 'react'
import Map, { NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { RouteLayer } from './RouteLayer'
import { CurrentLocationMarker } from './CurrentLocationMarker'
import { PhotoClusterMarkers } from './PhotoClusterMarkers'
import { PhotoGalleryModal } from './PhotoGalleryModal'
import { clusterPhotos, type PhotoCluster } from '@/lib/geo'
import type { CheckIn, Photo } from '@/lib/db'

interface Props {
  checkIns: CheckIn[]
  photos: Photo[]
  flyToTarget: { lat: number; lng: number } | null
  selectedCluster: PhotoCluster | null
  onSelectCluster: (cluster: PhotoCluster | null) => void
}

function getInitialView(checkIns: CheckIn[]) {
  if (checkIns.length === 0) return { longitude: 15, latitude: 50, zoom: 4 }
  const lats = checkIns.map((c) => c.lat)
  const lngs = checkIns.map((c) => c.lng)
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs))
  const zoom = spread < 0.05 ? 12 : spread < 2 ? 7 : spread < 10 ? 5 : 4
  return { longitude: centerLng, latitude: centerLat, zoom }
}

export function TripMap({ checkIns, photos, flyToTarget, selectedCluster, onSelectCluster }: Props) {
  const mapRef = useRef<MapRef>(null)
  const clusters = useMemo(() => clusterPhotos(photos), [photos])

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: 13,
      duration: 1200,
    })
  }, [flyToTarget])

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={getInitialView(checkIns)}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: '100%', height: '100vh' }}
    >
      <NavigationControl position="top-right" />
      <RouteLayer checkIns={checkIns} />
      <CurrentLocationMarker checkIn={checkIns.at(-1)} />
      <PhotoClusterMarkers clusters={clusters} onSelect={onSelectCluster} />
      {selectedCluster && (
        <PhotoGalleryModal cluster={selectedCluster} onClose={() => onSelectCluster(null)} />
      )}
    </Map>
  )
}
