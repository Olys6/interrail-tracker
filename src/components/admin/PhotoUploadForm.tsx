'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, MapPin } from 'lucide-react'

export function PhotoUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [caption, setCaption] = useState('')
  const [useGps, setUseGps] = useState(true)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const getCoords = (): Promise<{ lat: number; lng: number }> => {
    if (!useGps) {
      const lat = parseFloat(manualLat)
      const lng = parseFloat(manualLng)
      if (isNaN(lat) || isNaN(lng)) return Promise.reject(new Error('Invalid coordinates'))
      return Promise.resolve({ lat, lng })
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Could not get location — check browser permissions')),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select at least one photo.')
      return
    }

    setError(null)
    setStatus('uploading')
    setProgress(0)

    try {
      const coords = await getCoords()
      const total = files.length

      for (let i = 0; i < total; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        formData.append('lat', String(coords.lat))
        formData.append('lng', String(coords.lng))
        if (caption.trim()) formData.append('caption', caption.trim())

        const res = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(msg)
        }

        setProgress(Math.round(((i + 1) / total) * 100))
      }

      setStatus('done')
      setFiles(null)
      setCaption('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Try again.')
      setStatus('idle')
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(e.target.files)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700"
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={useGps}
          onChange={(e) => setUseGps(e.target.checked)}
          className="rounded"
        />
        <MapPin className="h-3.5 w-3.5" />
        Use GPS location
      </label>

      {!useGps && (
        <div className="flex gap-2">
          <input
            type="number"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            placeholder="Latitude"
            step="any"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            placeholder="Longitude"
            step="any"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={status === 'uploading' || status === 'done'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {status === 'uploading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading… {progress}%
          </>
        ) : status === 'done' ? (
          <>
            <Camera className="h-4 w-4" />
            Uploaded!
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Upload Photos
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
