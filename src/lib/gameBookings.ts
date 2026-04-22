export type GameType = 'elmStreet' | 'butchery' | 'wrongTurn'

export interface BookingsForDate {
  elmStreet: string[]
  butchery: string[]
  wrongTurn: string[]
}

export type BookingsByDate = Record<string, BookingsForDate>

const STORAGE_KEY = 'elmshiftr.bookingsByDate.v1'
const SLOT_INTERVAL_MINUTES = 90
const SLOTS_PER_GAME = 11

export const GAME_CONFIG: Record<GameType, { label: string; chipClass: string }> = {
  elmStreet: {
    label: 'אלם סטריט',
    chipClass: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  butchery: {
    label: 'הקצביה',
    chipClass: 'bg-rose-50 border-rose-200 text-rose-800',
  },
  wrongTurn: {
    label: 'טעות בכיוון',
    chipClass: 'bg-sky-50 border-sky-200 text-sky-800',
  },
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

function minutesToTimeLabel(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${pad2(hours)}:${pad2(minutes)}`
}

function buildSlots(startTime: string): string[] {
  const [hours, minutes] = startTime.split(':').map(Number)
  const start = (hours * 60) + minutes

  return Array.from({ length: SLOTS_PER_GAME }, (_, index) => {
    const slotMinutes = start + (index * SLOT_INTERVAL_MINUTES)
    return minutesToTimeLabel(slotMinutes)
  })
}

export function getElmStreetSlots(): string[] {
  return buildSlots('11:00')
}

export function getSharedSlots(): string[] {
  return buildSlots('11:30')
}

export function getGameSlots(gameType: GameType): string[] {
  if (gameType === 'elmStreet') {
    return getElmStreetSlots()
  }

  return getSharedSlots()
}

export function createEmptyBookingsForDate(): BookingsForDate {
  return {
    elmStreet: [],
    butchery: [],
    wrongTurn: [],
  }
}

function sanitizeSlots(gameType: GameType, slots: string[] | undefined): string[] {
  if (!Array.isArray(slots)) return []

  const allowed = new Set(getGameSlots(gameType))
  const unique = new Set<string>()

  for (const slot of slots) {
    if (typeof slot === 'string' && allowed.has(slot)) {
      unique.add(slot)
    }
  }

  return getGameSlots(gameType).filter(slot => unique.has(slot))
}

function normalizeBookingsForDate(value: unknown): BookingsForDate {
  const source = (value && typeof value === 'object') ? (value as Partial<BookingsForDate>) : {}

  return {
    elmStreet: sanitizeSlots('elmStreet', source.elmStreet),
    butchery: sanitizeSlots('butchery', source.butchery),
    wrongTurn: sanitizeSlots('wrongTurn', source.wrongTurn),
  }
}

export function getAllBookingsByDate(): BookingsByDate {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as Record<string, unknown>

    return Object.entries(parsed || {}).reduce<BookingsByDate>((acc, [date, data]) => {
      acc[date] = normalizeBookingsForDate(data)
      return acc
    }, {})
  } catch {
    return {}
  }
}

export function getBookingsForDate(date: string): BookingsForDate {
  const bookings = getAllBookingsByDate()
  return bookings[date] ? normalizeBookingsForDate(bookings[date]) : createEmptyBookingsForDate()
}

export function saveBookingsForDate(date: string, data: BookingsForDate): void {
  if (!date || typeof window === 'undefined') return

  const bookings = getAllBookingsByDate()
  bookings[date] = normalizeBookingsForDate(data)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}
