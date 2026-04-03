import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ISRAEL_TIMEZONE = 'Asia/Jerusalem'

type VenueConfig = {
  venueKey: 'butchery' | 'elm_street'
  venueName: string
  sourceUrl: string
}

type VenueResult = {
  venueKey: string
  venueName: string
  sourceUrl: string
  orderedGames: string[]
  error?: string
}

const VENUES: VenueConfig[] = [
  {
    venueKey: 'butchery',
    venueName: 'הקצביה',
    sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-the-butchery',
  },
  {
    venueKey: 'elm_street',
    venueName: 'אלם סטריט',
    sourceUrl: 'https://www.escaperoom.co.il/tel-Aviv-elm-street',
  },
]

const RESERVED_KEYWORDS = [
  'הוזמן',
  'הוזמנו',
  'תפוס',
  'לא פנוי',
  'אזל',
  'reserved',
  'booked',
  'unavailable',
  'sold out',
]

const CACHE_TTL_MS = 5 * 60 * 1000
let cache:
  | {
      key: string
      expiresAt: number
      payload: Record<string, unknown>
    }
  | undefined

function todayInIsrael(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function normalizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

function extractOrderedTimes(html: string): string[] {
  const text = normalizeHtml(html)
  const matches: string[] = []
  const timeRegex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g

  for (const match of text.matchAll(timeRegex)) {
    const time = match[0]
    const index = match.index ?? 0
    const context = text.slice(Math.max(0, index - 80), index + 80).toLowerCase()

    if (RESERVED_KEYWORDS.some((keyword) => context.includes(keyword.toLowerCase()))) {
      matches.push(time)
    }
  }

  return [...new Set(matches)].sort((a, b) => a.localeCompare(b, 'en'))
}

async function fetchVenueOrderedGames(venue: VenueConfig): Promise<VenueResult> {
  try {
    const res = await fetch(venue.sourceUrl, {
      headers: {
        'User-Agent': 'ElmShiftr/1.0 (booked-games-monitor)',
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const html = await res.text()
    const orderedGames = extractOrderedTimes(html)

    return {
      venueKey: venue.venueKey,
      venueName: venue.venueName,
      sourceUrl: venue.sourceUrl,
      orderedGames,
    }
  } catch (_error) {
    return {
      venueKey: venue.venueKey,
      venueName: venue.venueName,
      sourceUrl: venue.sourceUrl,
      orderedGames: [],
      error: 'לא ניתן למשוך נתונים כרגע',
    }
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({ ok: true })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const date = todayInIsrael()
  const cacheKey = `games-${date}`
  const now = Date.now()

  if (cache && cache.key === cacheKey && cache.expiresAt > now) {
    return jsonResponse({ ...cache.payload, stale: true })
  }

  const venues = await Promise.all(VENUES.map(fetchVenueOrderedGames))
  const hasErrors = venues.some((venue) => Boolean(venue.error))

  const payload = {
    date,
    timezone: ISRAEL_TIMEZONE,
    status: hasErrors ? 'partial_success' : 'success',
    venues,
    lastUpdatedAt: new Date().toISOString(),
    stale: false,
  }

  cache = {
    key: cacheKey,
    expiresAt: now + CACHE_TTL_MS,
    payload,
  }

  return jsonResponse(payload)
})
