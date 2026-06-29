import { Route, Globe2, CalendarDays, MapPin } from 'lucide-react'
import { haversineKm } from '@/lib/geo'
import type { CheckIn, Photo } from '@/lib/db'

interface Props {
  checkIns: CheckIn[]
  photos: Photo[]
}

function computeStats(checkIns: CheckIn[], photos: Photo[]) {
  let distanceKm = 0
  for (let i = 1; i < checkIns.length; i++) {
    const a = checkIns[i - 1]
    const b = checkIns[i]
    distanceKm += haversineKm(a.lat, a.lng, b.lat, b.lng)
  }

  const countries = new Set(
    checkIns.map((c) => c.country).filter((c): c is string => !!c)
  ).size

  let days = 0
  if (checkIns.length > 0) {
    const first = new Date(checkIns[0].created_at).getTime()
    const last = new Date(checkIns[checkIns.length - 1].created_at).getTime()
    days = Math.max(1, Math.round((last - first) / 86_400_000) + 1)
  }

  return {
    distance: Math.round(distanceKm),
    countries,
    days,
    stops: checkIns.length,
    photos: photos.length,
  }
}

export function StatsBanner({ checkIns, photos }: Props) {
  const stats = computeStats(checkIns, photos)
  if (stats.stops === 0) return null

  const items = [
    { icon: Route, label: 'km', value: stats.distance.toLocaleString() },
    ...(stats.countries > 0
      ? [{ icon: Globe2, label: stats.countries === 1 ? 'country' : 'countries', value: String(stats.countries) }]
      : []),
    { icon: CalendarDays, label: stats.days === 1 ? 'day' : 'days', value: String(stats.days) },
    { icon: MapPin, label: stats.stops === 1 ? 'stop' : 'stops', value: String(stats.stops) },
  ]

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-1 text-xs text-gray-600">
          <Icon className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold text-gray-900">{value}</span>
          <span className="text-gray-400">{label}</span>
        </div>
      ))}
    </div>
  )
}
