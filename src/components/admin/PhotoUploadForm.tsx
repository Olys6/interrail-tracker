'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, MapPin } from 'lucide-react'
import type { CheckIn } from '@/lib/db'
import { parseCoords } from '@/lib/geo'

// Fetches a presigned PUT URL, then uploads straight to storage from the
// browser (bypassing our server) so large phone photos and motion photos
// don't hit the request body limit of the /api/photos serverless function.
// XMLHttpRequest is used instead of fetch so upload progress is available.
async function uploadToStorage(file: File, onProgress: (percentage: number) => void): Promise<string> {
  const res = await fetch('/api/photos/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: `Failed to get upload URL (${res.status})` }))
    throw new Error(error)
  }
  const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })

  return publicUrl
}

type LocationSource = 'gps' | 'checkin' | 'manual'

async function readExifCoords(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const exifr = (await import('exifr')).default
    const gps = await exifr.gps(file)
    if (!gps) return null
    // Android's photo picker often hands over images with partial or zeroed
    // GPS tags, which exifr turns into NaN or (0, 0). Both must be treated as
    // "no location" so the photo falls through to the fallback below —
    // previously NaN passed the check here and was serialised to null, which
    // the API then read back as a literal 0.
    const coords = parseCoords(gps.latitude, gps.longitude)
    if (coords.ok) return { lat: coords.lat, lng: coords.lng }
  } catch {
    // Unreadable/absent EXIF is expected (phone pickers strip GPS) — fall back.
  }
  return null
}

const MAX_DIMENSION = 2200
const JPEG_QUALITY = 0.85
const SKIP_COMPRESSION_BELOW_BYTES = 1_500_000

// Downscales/re-encodes oversized phone photos before they hit Blob storage.
// Falls back to the original file on any failure (e.g. HEIC decoding not
// supported in this browser) so a bad photo never blocks the whole upload.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (file.size < SKIP_COMPRESSION_BELOW_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export function PhotoUploadForm({ checkIns }: { checkIns: CheckIn[] }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recentCheckIns = [...checkIns].reverse()
  const [files, setFiles] = useState<FileList | null>(null)
  const [caption, setCaption] = useState('')
  const [source, setSource] = useState<LocationSource>('gps')
  const [checkInId, setCheckInId] = useState(recentCheckIns[0] ? String(recentCheckIns[0].id) : '')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [exifCount, setExifCount] = useState<{ found: number; total: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Coordinates used for photos without embedded GPS. Device GPS is resolved
  // lazily by the caller so users aren't prompted when every photo has EXIF.
  const getFallbackCoords = (): Promise<{ lat: number; lng: number }> => {
    if (source === 'manual') {
      const coords = parseCoords(manualLat, manualLng)
      if (!coords.ok) {
        return Promise.reject(
          new Error(
            coords.reason === 'out-of-range'
              ? 'Coordinates out of range — latitude is -90…90, longitude is -180…180'
              : 'Enter a valid latitude and longitude'
          )
        )
      }
      return Promise.resolve({ lat: coords.lat, lng: coords.lng })
    }
    if (source === 'checkin') {
      const checkIn = checkIns.find((c) => String(c.id) === checkInId)
      if (!checkIn) return Promise.reject(new Error('Select a check-in first'))
      const coords = parseCoords(checkIn.lat, checkIn.lng)
      if (!coords.ok) {
        return Promise.reject(
          new Error("That check-in has no usable coordinates — pick another one or enter them manually")
        )
      }
      return Promise.resolve({ lat: coords.lat, lng: coords.lng })
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = parseCoords(pos.coords.latitude, pos.coords.longitude)
          if (!coords.ok) {
            reject(new Error('Device GPS returned no usable fix — pick a check-in or enter coordinates'))
            return
          }
          resolve({ lat: coords.lat, lng: coords.lng })
        },
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
      const total = files.length
      let fallbackPromise: Promise<{ lat: number; lng: number }> | null = null

      for (let i = 0; i < total; i++) {
        const file = files[i]

        // Each photo keeps its own embedded location when present; the
        // fallback source only covers photos whose EXIF has no GPS (mobile
        // photo pickers strip it for privacy).
        const coords =
          (await readExifCoords(file)) ?? (await (fallbackPromise ??= getFallbackCoords()))

        // Resize/re-encode oversized photos before upload — EXIF is already
        // read above, so this can't affect location extraction.
        const uploadFile = await compressImage(file)

        const url = await uploadToStorage(uploadFile, (percentage) => {
          setProgress(Math.round(((i + percentage / 100) / total) * 100))
        })

        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blob_url: url,
            lat: coords.lat,
            lng: coords.lng,
            caption: caption.trim() || null,
          }),
        })

        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }))
          throw new Error(msg)
        }

        setProgress(Math.round(((i + 1) / total) * 100))
      }

      setStatus('done')
      setFiles(null)
      setCaption('')
      setExifCount(null)
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
        onChange={async (e) => {
          const selectedFiles = e.target.files
          setFiles(selectedFiles)
          setExifCount(null)
          if (selectedFiles && selectedFiles.length > 0) {
            const results = await Promise.all(Array.from(selectedFiles).map(readExifCoords))
            const found = results.filter(Boolean).length
            setExifCount({ found, total: selectedFiles.length })
          }
        }}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700"
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {exifCount && exifCount.found === exifCount.total && (
        <p className="text-xs text-green-600">
          📍 {exifCount.total === 1 ? 'Location read from photo' : 'All photos have embedded locations'}
        </p>
      )}
      {exifCount && exifCount.found > 0 && exifCount.found < exifCount.total && (
        <p className="text-xs text-amber-600">
          📍 {exifCount.found} of {exifCount.total} photos have embedded locations — the rest use
          the fallback below
        </p>
      )}
      {exifCount && exifCount.found === 0 && (
        <p className="text-xs text-gray-400">
          No location in {exifCount.total === 1 ? 'photo' : 'photos'} — using the fallback below
        </p>
      )}

      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0">Fallback location</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as LocationSource)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gps">Device GPS</option>
          {recentCheckIns.length > 0 && <option value="checkin">A check-in</option>}
          <option value="manual">Manual coordinates</option>
        </select>
      </label>

      {source === 'checkin' && (
        <select
          value={checkInId}
          onChange={(e) => setCheckInId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {recentCheckIns.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.place_name ?? `${Number(c.lat).toFixed(3)}, ${Number(c.lng).toFixed(3)}`}
              {' — '}
              {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </option>
          ))}
        </select>
      )}

      {source === 'manual' && (
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
