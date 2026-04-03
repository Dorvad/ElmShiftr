export interface VenueBookedGames {
  venueKey: string
  venueName: string
  orderedGames: string[]
  sourceUrl: string
  error?: string
}

export interface BookedGamesResponse {
  date: string
  timezone: 'Asia/Jerusalem'
  status: 'success' | 'partial_success'
  venues: VenueBookedGames[]
  lastUpdatedAt: string
  stale?: boolean
}

const BOOKED_GAMES_ENDPOINT = import.meta.env.VITE_BOOKED_GAMES_ENDPOINT as string | undefined
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeSupabaseOrigin(value: string): string {
  try {
    const parsed = new URL(value)
    return parsed.origin
  } catch {
    return value.replace(/\/+$/, '')
  }
}

function getBookedGamesEndpointCandidates(): string[] {
  const configuredEndpoint = normalizeUrl(BOOKED_GAMES_ENDPOINT)
  if (configuredEndpoint) return [configuredEndpoint]

  const supabaseUrl = normalizeUrl(SUPABASE_URL)
  if (!supabaseUrl) return []

  const baseOrigin = normalizeSupabaseOrigin(supabaseUrl)
  return [
    `${baseOrigin}/functions/v1/get-today-booked-games`,
    `${baseOrigin}/functions/v1/today-booked-games`,
  ]
}

export function getBookedGamesEndpoint(): string | null {
  return getBookedGamesEndpointCandidates()[0] ?? null
}

export async function fetchTodayBookedGames(signal?: AbortSignal): Promise<BookedGamesResponse> {
  const endpoints = getBookedGamesEndpointCandidates()

  if (endpoints.length === 0) {
    throw new Error('לא הוגדר endpoint לטעינת משחקים שהוזמנו (VITE_BOOKED_GAMES_ENDPOINT).')
  }

  let lastError: Error | null = null
  let encountered404 = false

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal,
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          encountered404 = true
          lastError = new Error(`השרת החזיר שגיאה (${response.status}).`)
          continue
        }

        throw new Error(`השרת החזיר שגיאה (${response.status}).`)
      }

      const data = (await response.json()) as BookedGamesResponse

      if (!data || !Array.isArray(data.venues)) {
        throw new Error('התקבלה תשובה לא תקינה מהשרת.')
      }

      return data
    } catch (err) {
      if (signal?.aborted) {
        throw err
      }

      if (err instanceof Error) {
        lastError = err
      } else {
        lastError = new Error('לא ניתן לטעון את נתוני המשחקים כרגע.')
      }
    }
  }

  if (encountered404) {
    throw new Error('נקודת הקצה לא נמצאה (404). בדקו שה-Edge Function פרוסה ושמשתני הסביבה מוגדרים נכון.')
  }

  throw lastError ?? new Error('לא ניתן לטעון את נתוני המשחקים כרגע.')
}
