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

export function getBookedGamesEndpoint(): string | null {
  if (!BOOKED_GAMES_ENDPOINT) return null
  return BOOKED_GAMES_ENDPOINT
}

export async function fetchTodayBookedGames(signal?: AbortSignal): Promise<BookedGamesResponse> {
  const endpoint = getBookedGamesEndpoint()
  if (!endpoint) {
    throw new Error('לא הוגדר endpoint לטעינת משחקים שהוזמנו (VITE_BOOKED_GAMES_ENDPOINT).')
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`השרת החזיר שגיאה (${response.status}).`)
  }

  const data = (await response.json()) as BookedGamesResponse

  if (!data || !Array.isArray(data.venues)) {
    throw new Error('התקבלה תשובה לא תקינה מהשרת.')
  }

  return data
}
