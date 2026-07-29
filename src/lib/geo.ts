import type { Photo } from './db'

export type CoordResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'missing' | 'null-island' | 'out-of-range' }

// Coerce an untrusted value into a coordinate. Deliberately stricter than
// Number(): NaN survives a `!= null` check, JSON.stringify writes it as null,
// and Number(null) is 0 — so a NaN coordinate (bad or partial EXIF GPS tags)
// silently turns into a real-looking 0 by the time it reaches the DB.
function toCoord(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// Single gate for every coordinate that enters the app (EXIF, device GPS,
// manual entry, API bodies, MCP args). (0, 0) is "Null Island" — the sentinel
// a device writes when it had no fix, never a real stop on an Interrail trip.
export function parseCoords(lat: unknown, lng: unknown): CoordResult {
  const parsedLat = toCoord(lat)
  const parsedLng = toCoord(lng)
  if (parsedLat === null || parsedLng === null) return { ok: false, reason: 'missing' }
  if (parsedLat === 0 && parsedLng === 0) return { ok: false, reason: 'null-island' }
  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    return { ok: false, reason: 'out-of-range' }
  }
  return { ok: true, lat: parsedLat, lng: parsedLng }
}

export interface PhotoCluster {
  lat: number
  lng: number
  photos: Photo[]
}

const CLUSTER_RADIUS_KM = 0.5

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function clusterPhotos(photos: Photo[], radiusKm = CLUSTER_RADIUS_KM): PhotoCluster[] {
  const clusters: PhotoCluster[] = []
  for (const photo of photos) {
    const match = clusters.find(
      (c) => haversineKm(c.lat, c.lng, photo.lat, photo.lng) < radiusKm
    )
    if (match) {
      match.photos.push(photo)
      match.lat = match.photos.reduce((s, p) => s + p.lat, 0) / match.photos.length
      match.lng = match.photos.reduce((s, p) => s + p.lng, 0) / match.photos.length
    } else {
      clusters.push({ lat: photo.lat, lng: photo.lng, photos: [photo] })
    }
  }
  return clusters
}
