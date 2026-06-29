import type { Photo } from './db'

export interface PhotoCluster {
  lat: number
  lng: number
  photos: Photo[]
}

const CLUSTER_RADIUS_KM = 0.5

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
