import { ImageResponse } from 'next/og'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = "Oliver's Interrail Trip"

export default async function Image() {
  let city = 'Trip starting soon'
  let stops = 0
  let photos = 0

  try {
    const [latestCheckIn, stopCount, photoCount] = await Promise.all([
      sql`SELECT place_name FROM check_ins ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT COUNT(*)::int AS count FROM check_ins`,
      sql`SELECT COUNT(*)::int AS count FROM photos`,
    ])

    if (latestCheckIn.length > 0 && latestCheckIn[0].place_name) {
      city = latestCheckIn[0].place_name as string
    } else if (latestCheckIn.length > 0) {
      city = 'Somewhere in Europe'
    }

    stops = (stopCount[0]?.count as number) ?? 0
    photos = (photoCount[0]?.count as number) ?? 0
  } catch {
    // Render a sensible default if the DB query fails
    city = 'Somewhere in Europe'
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 96px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #1a4a7a 100%)',
          position: 'relative',
        }}
      >
        {/* Decorative circle top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        {/* Decorative circle bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* Train icon row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '36px', marginRight: '12px' }}>🚂</span>
          <span
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Live Trip Tracker
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '68px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '32px',
          }}
        >
          Oliver&apos;s Interrail Trip
        </div>

        {/* Current location */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '48px',
            fontWeight: 700,
            color: '#7dd3fc',
            marginBottom: '40px',
          }}
        >
          <span style={{ marginRight: '12px' }}>📍</span>
          <span>Currently in {city}</span>
        </div>

        {/* Stats pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '48px',
            padding: '14px 32px',
          }}
        >
          <span style={{ fontSize: '32px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {stops} {stops === 1 ? 'stop' : 'stops'}
          </span>
          <span
            style={{
              fontSize: '32px',
              color: 'rgba(255,255,255,0.4)',
              margin: '0 20px',
            }}
          >
            ·
          </span>
          <span style={{ fontSize: '32px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {photos} {photos === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '64px',
            fontSize: '22px',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.05em',
          }}
        >
          interrail-tracker.vercel.app
        </div>
      </div>
    ),
    { ...size },
  )
}
