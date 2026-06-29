'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import type { Photo } from '@/lib/db'

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    setDeleting(id)
    await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(null)
  }

  if (photos.length === 0) {
    return <p className="text-sm text-gray-400">No photos uploaded yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={photo.blob_url}
            alt={photo.caption || 'Trip photo'}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
          {photo.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-2">
              <p className="truncate text-xs text-white">{photo.caption}</p>
            </div>
          )}
          <button
            onClick={() => handleDelete(photo.id)}
            disabled={deleting === photo.id}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
