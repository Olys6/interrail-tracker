'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Loader2 } from 'lucide-react'

export function CheckInButton() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'locating' | 'saving' | 'done'>('idle')
  const [placeName, setPlaceName] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCheckIn = () => {
    setError(null)
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('saving')
        try {
          const res = await fetch('/api/check-ins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              place_name: placeName.trim() || null,
              note: note.trim() || null,
            }),
          })
          if (!res.ok) throw new Error('Failed to save')
          setStatus('done')
          setPlaceName('')
          setNote('')
          router.refresh()
          setTimeout(() => setStatus('idle'), 2000)
        } catch {
          setError('Failed to save check-in. Try again.')
          setStatus('idle')
        }
      },
      () => {
        setError('Could not get your location. Check browser permissions.')
        setStatus('idle')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const isLoading = status === 'locating' || status === 'saving'

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        placeholder="Place name (optional, e.g. Rome Termini)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Journal note (optional, e.g. climbed the castle, best schnitzel ever)"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleCheckIn}
        disabled={isLoading || status === 'done'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === 'locating' ? 'Getting location…' : 'Saving…'}
          </>
        ) : status === 'done' ? (
          <>
            <MapPin className="h-4 w-4" />
            Checked in!
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            Check In Here
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
