'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { X, MapPin, Camera, Images, ChevronRight } from 'lucide-react'
import { clusterPhotos, describePlace, type PhotoCluster } from '@/lib/geo'
import type { CheckIn, Photo } from '@/lib/db'
import { Guestbook } from './Guestbook'

interface Props {
  open: boolean
  onClose: () => void
  checkIns: CheckIn[]
  photos: Photo[]
  onFlyTo: (lat: number, lng: number) => void
  onSelectCluster: (cluster: PhotoCluster) => void
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Sidebar({ open, onClose, checkIns, photos, onFlyTo, onSelectCluster }: Props) {
  const clusters = useMemo(() => clusterPhotos(photos), [photos])

  // Each cluster gets the name of the nearest stop, so a tile can say where
  // the photos were taken — photos themselves only carry coordinates.
  const clusterPlaces = useMemo(
    () => clusters.map((c) => describePlace(c.lat, c.lng, checkIns)),
    [clusters, checkIns]
  )

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel — slides from right on all screen sizes, full-width on mobile */}
      <div
        className={`fixed right-0 top-0 z-40 h-full w-full transform bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-80 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-4">
            <h2 className="font-semibold text-gray-900">Trip Browser</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Stops */}
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                Stops ({checkIns.length})
              </div>

              {checkIns.length === 0 ? (
                <p className="text-sm text-gray-400">No stops yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200">
                  {[...checkIns].reverse().map((c) => (
                    <li key={c.id} className="mb-5 ml-4">
                      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
                      <button
                        onClick={() => { onFlyTo(c.lat, c.lng); onClose() }}
                        className="group text-left"
                      >
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600">
                          {c.place_name || `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`}
                        </p>
                        <p className="text-xs text-gray-400">{timeAgo(c.created_at)}</p>
                      </button>
                      {c.note && (
                        <p className="mt-1 whitespace-pre-line text-sm italic leading-snug text-gray-600">
                          {c.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Photos */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Camera className="h-3.5 w-3.5" />
                Photos ({photos.length})
              </div>
              {clusters.length > 0 && (
                <p className="mb-3 mt-1 text-xs text-gray-400">
                  Tap a place to see all its photos.
                </p>
              )}

              {clusters.length === 0 ? (
                <p className="text-sm text-gray-400">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-2">
                  {/* Two layout guards, both from putting text under the tile:
                      min-w-0, because a 1fr track still grows to fit
                      min-content and a long place name made one column wider
                      than the other; and flex-col, because a <button> centres
                      its content, so tiles without the "View all" line floated
                      half a line lower than their neighbour. */}
                  {clusters.map((cluster, i) => (
                    <button
                      key={i}
                      onClick={() => { onFlyTo(cluster.lat, cluster.lng); onSelectCluster(cluster); onClose() }}
                      className="group flex w-full min-w-0 flex-col items-stretch text-left"
                    >
                      {/* The square frame is a <span>, not the <button> itself:
                          WebKit doesn't make a button a containing block for
                          absolutely positioned children, so on iOS Safari a
                          `fill` image inside one escaped its tile and the
                          photos piled up on top of each other. pt-[100%] on a
                          zero-height box instead of aspect-square keeps the
                          tiles square on older iOS too. */}
                      <span className="relative block h-0 w-full overflow-hidden rounded-xl bg-gray-100 pt-[100%]">
                        <Image
                          src={cluster.photos[0].blob_url}
                          alt={cluster.photos[0].caption || 'Trip photo'}
                          fill
                          sizes="(max-width: 640px) 45vw, 140px"
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {cluster.photos.length > 1 && (
                          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">
                            <Images className="h-3 w-3" />
                            {cluster.photos.length}
                          </span>
                        )}
                        {cluster.photos[0].caption && (
                          <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/60 p-2">
                            <span className="block truncate text-xs text-white">{cluster.photos[0].caption}</span>
                          </span>
                        )}
                      </span>

                      <span className="mt-1.5 flex min-w-0 items-center gap-1 text-xs font-medium text-gray-700">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{clusterPlaces[i]}</span>
                      </span>

                      {/* Spelling out the action: a stack of photos behind one
                          thumbnail wasn't reading as something you could open. */}
                      {cluster.photos.length > 1 && (
                        <span className="mt-0.5 flex min-w-0 items-center text-[11px] font-medium text-blue-600 group-hover:underline">
                          <span className="truncate">View all {cluster.photos.length} photos</span>
                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Guestbook */}
            <div className="px-4 py-4">
              <Guestbook />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
