'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, MapPin } from 'lucide-react'
import type { CheckIn } from '@/lib/db'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function CheckInList({ checkIns }: { checkIns: CheckIn[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    setDeleting(id)
    await fetch(`/api/check-ins/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(null)
  }

  if (checkIns.length === 0) {
    return <p className="text-sm text-gray-400">No check-ins yet.</p>
  }

  return (
    <ul className="space-y-2">
      {[...checkIns].reverse().map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="truncate font-medium text-gray-800">
              {c.place_name || `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`}
            </span>
            <span className="shrink-0 text-gray-400">{timeAgo(c.created_at)}</span>
          </div>
          <button
            onClick={() => handleDelete(c.id)}
            disabled={deleting === c.id}
            className="ml-2 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}
