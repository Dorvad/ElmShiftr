import { supabase } from './supabase'

export type GameType = 'elmStreet' | 'butchery' | 'wrongTurn'

export interface BookingsForDate {
  elmStreet: string[]
  butchery: string[]
  wrongTurn: string[]
}

export type BookingsByDate = Record<string, BookingsForDate>

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

const SLOT_INTERVAL_MINUTES = 90
const SLOTS_PER_GAME = 11

interface GameBookingsRow {
  date: string
  elm_street_slots: string[]
  butchery_slots: string[]
  wrong_turn_slots: string[]
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

export function normalizeBookingsForDate(value: unknown): BookingsForDate {
  const source = (value && typeof value === 'object') ? (value as Partial<BookingsForDate>) : {}

  return {
    elmStreet: sanitizeSlots('elmStreet', source.elmStreet),
    butchery: sanitizeSlots('butchery', source.butchery),
    wrongTurn: sanitizeSlots('wrongTurn', source.wrongTurn),
  }
}

function fromRow(row: GameBookingsRow | null): BookingsForDate {
  if (!row) return createEmptyBookingsForDate()

  return normalizeBookingsForDate({
    elmStreet: row.elm_street_slots,
    butchery: row.butchery_slots,
    wrongTurn: row.wrong_turn_slots,
  })
}

export async function getBookingsForDate(date: string): Promise<BookingsForDate> {
  if (!date) return createEmptyBookingsForDate()

  const { data, error } = await supabase
    .from('game_bookings')
    .select('date, elm_street_slots, butchery_slots, wrong_turn_slots')
    .eq('date', date)
    .maybeSingle()

  if (error) {
    throw new Error('לא ניתן לטעון את המשחקים שהוזמנו כרגע.')
  }

  return fromRow(data as GameBookingsRow | null)
}

export async function getBookingsForDates(dates: string[]): Promise<BookingsByDate> {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean)))
  if (uniqueDates.length === 0) return {}

  const { data, error } = await supabase
    .from('game_bookings')
    .select('date, elm_street_slots, butchery_slots, wrong_turn_slots')
    .in('date', uniqueDates)

  if (error) {
    throw new Error('לא ניתן לטעון את המשחקים שהוזמנו כרגע.')
  }

  const rows = (data ?? []) as GameBookingsRow[]
  const byDate = rows.reduce<BookingsByDate>((acc, row) => {
    acc[row.date] = fromRow(row)
    return acc
  }, {})

  uniqueDates.forEach((date) => {
    if (!byDate[date]) byDate[date] = createEmptyBookingsForDate()
  })

  return byDate
}

export async function saveBookingsForDate(date: string, data: BookingsForDate): Promise<void> {
  if (!date) return

  const normalized = normalizeBookingsForDate(data)
  const payload = {
    date,
    elm_street_slots: normalized.elmStreet,
    butchery_slots: normalized.butchery,
    wrong_turn_slots: normalized.wrongTurn,
  }

  const { error } = await supabase
    .from('game_bookings')
    .upsert(payload, { onConflict: 'date' })

  if (error) {
    throw new Error('שמירת המשחקים נכשלה. נסו שוב בעוד רגע.')
  }
}
