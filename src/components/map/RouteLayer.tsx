'use client'

import { Source, Layer } from 'react-map-gl/mapbox'
import type { CheckIn } from '@/lib/db'

export function RouteLayer({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length < 2) return null

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: checkIns.map((c) => [c.lng, c.lat]),
        },
        properties: {},
      },
    ],
  }

  return (
    <Source id="route" type="geojson" data={geojson}>
      <Layer
        id="route-line"
        type="line"
        paint={{
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.85,
        }}
        layout={{
          'line-join': 'round',
          'line-cap': 'round',
        }}
      />
    </Source>
  )
}
