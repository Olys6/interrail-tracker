import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: unknown
}

function ok(id: string | number | null | undefined, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, result })
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

const TOOLS = [
  {
    name: 'get_trip_status',
    description: "Get the current trip overview: all stops, current location, and photo count.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_checkin',
    description: "Add a new location check-in. Provide a place name and optionally lat/lng. If lat/lng are omitted the place is geocoded automatically via Mapbox.",
    inputSchema: {
      type: 'object',
      properties: {
        place_name: { type: 'string', description: 'Name of the city or place, e.g. "Rome, Italy"' },
        lat: { type: 'number', description: 'Latitude (optional, auto-geocoded if omitted)' },
        lng: { type: 'number', description: 'Longitude (optional, auto-geocoded if omitted)' },
      },
      required: ['place_name'],
    },
  },
  {
    name: 'list_checkins',
    description: "List all trip check-ins in chronological order with IDs, place names, and timestamps.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'delete_checkin',
    description: "Delete a check-in by its ID.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'The check-in ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_photos',
    description: "List all uploaded trip photos with captions, locations, and URLs.",
    inputSchema: { type: 'object', properties: {} },
  },
]

async function geocode(placeName: string): Promise<{ lat: number; lng: number; resolved_name: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?access_token=${token}&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { features?: { center: [number, number]; place_name: string }[] }
  const feature = data.features?.[0]
  if (!feature) return null
  return { lng: feature.center[0], lat: feature.center[1], resolved_name: feature.place_name }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_trip_status': {
      const [checkIns, photos] = await Promise.all([
        sql`SELECT * FROM check_ins ORDER BY created_at ASC`,
        sql`SELECT id, caption, lat, lng, created_at FROM photos ORDER BY created_at DESC`,
      ])
      const last = checkIns.at(-1) as { lat: number; lng: number; place_name: string; created_at: string } | undefined
      return JSON.stringify({
        totalStops: checkIns.length,
        currentLocation: last
          ? { lat: last.lat, lng: last.lng, place: last.place_name, time: last.created_at }
          : null,
        totalPhotos: photos.length,
        allStops: checkIns,
      }, null, 2)
    }

    case 'add_checkin': {
      const placeName = args.place_name as string
      let lat = args.lat as number | undefined
      let lng = args.lng as number | undefined
      let resolvedName = placeName

      if (lat == null || lng == null) {
        const geo = await geocode(placeName)
        if (!geo) return `Could not geocode "${placeName}". Try providing lat/lng directly.`
        lat = geo.lat
        lng = geo.lng
        resolvedName = geo.resolved_name
      }

      await sql`INSERT INTO check_ins (lat, lng, place_name) VALUES (${lat}, ${lng}, ${resolvedName})`
      return `✓ Check-in added: ${resolvedName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }

    case 'list_checkins': {
      const rows = await sql`SELECT * FROM check_ins ORDER BY created_at ASC`
      if (rows.length === 0) return 'No check-ins yet.'
      return (rows as { id: number; place_name: string | null; lat: number; lng: number; created_at: string }[])
        .map((r, i) => `${i + 1}. [ID ${r.id}] ${r.place_name ?? `${r.lat}, ${r.lng}`} — ${new Date(r.created_at).toLocaleString()}`)
        .join('\n')
    }

    case 'delete_checkin': {
      const id = args.id as number
      await sql`DELETE FROM check_ins WHERE id = ${id}`
      return `✓ Deleted check-in #${id}`
    }

    case 'list_photos': {
      const rows = await sql`SELECT * FROM photos ORDER BY created_at DESC`
      if (rows.length === 0) return 'No photos yet.'
      return (rows as { id: number; caption: string | null; lat: number; lng: number; blob_url: string; created_at: string }[])
        .map((r) => `[ID ${r.id}] ${r.caption ?? '(no caption)'} at (${r.lat}, ${r.lng}) — ${new Date(r.created_at).toLocaleString()}\n  ${r.blob_url}`)
        .join('\n\n')
    }

    default:
      return `Unknown tool: ${name}`
  }
}

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return rpcError(null, -32001, 'Unauthorized: provide your admin password in the x-admin-password header')
  }

  let body: JsonRpcRequest
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error: invalid JSON')
  }

  const { id, method, params } = body

  // Notifications (no id) — acknowledge with no body
  if (id === undefined) {
    return new Response(null, { status: 202 })
  }

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'interrail-tracker', version: '1.0.0' },
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: TOOLS })

    case 'tools/call': {
      const { name, arguments: toolArgs = {} } = params as { name: string; arguments?: Record<string, unknown> }
      try {
        const text = await callTool(name, toolArgs)
        return ok(id, { content: [{ type: 'text', text }] })
      } catch (e) {
        return rpcError(id, -32000, e instanceof Error ? e.message : String(e))
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function GET() {
  return Response.json({ status: 'ok', server: 'interrail-tracker MCP', tools: TOOLS.map((t) => t.name) })
}
