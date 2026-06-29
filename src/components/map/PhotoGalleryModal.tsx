'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PhotoCluster } from '@/lib/geo'

interface Props {
  cluster: PhotoCluster
  onClose: () => void
}

export function PhotoGalleryModal({ cluster, onClose }: Props) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)

  const goNext = () => {
    if (fullscreenIndex === null) return
    setFullscreenIndex((fullscreenIndex + 1) % cluster.photos.length)
  }

  const goPrev = () => {
    if (fullscreenIndex === null) return
    setFullscreenIndex((fullscreenIndex - 1 + cluster.photos.length) % cluster.photos.length)
  }

  return (
    <>
      {/* Gallery modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              {cluster.photos.length} photo{cluster.photos.length !== 1 ? 's' : ''} from this area
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {cluster.photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setFullscreenIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
              >
                <Image
                  src={photo.blob_url}
                  alt={photo.caption || 'Trip photo'}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-1.5">
                    <p className="truncate text-xs text-white">{photo.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen viewer — sibling, not child, so z-[60] is genuinely above z-50 */}
      {fullscreenIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95">
          <Image
            src={cluster.photos[fullscreenIndex].blob_url}
            alt={cluster.photos[fullscreenIndex].caption || 'Trip photo'}
            fill
            sizes="100vw"
            className="object-contain"
          />
          {cluster.photos[fullscreenIndex].caption && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <span className="rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
                {cluster.photos[fullscreenIndex].caption}
              </span>
            </div>
          )}

          <button
            onClick={() => setFullscreenIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          {cluster.photos.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
