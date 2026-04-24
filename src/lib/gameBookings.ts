import { supabase } from './supabase'

// ── Slot definitions ──────────────────────────────────────────────────────────
// Elm Street starts 11:00, 1.5-hour intervals
// Butchery + Wrong Turn start 11:30, same interval, shared schedule

export const ELM_STREET_SLOTS: readonly string[] = [
  '11:00', '12:30', '14:00', '15:30', '17:00', '18:30',
  '20:00', '21:30', '23:00', '00:30', '02:00',
]

export const SHARED_SLOTS: readonly string[] = [
  '11:30', '13:00', '14:30', '16:00', '17:30', '19:00',
  '20:30', '22:00', '23:30', '01:00', '02:30',
]

export type GameType = 'elmStreet' | 'butchery' | 'wrongTurn'

export function getElmStreetSlots(): readonly string[] { return ELM_STREET_SLOTS }
export function getSharedSlots():    readonly string[] { return SHARED_SLOTS }
export function getGameSlots(game: GameType): readonly string[] {
  return game === 'elmStreet' ? ELM_STREET_SLOTS : SHARED_SLOTS
}

// ── Game metadata (used for both display and editor) ──────────────────────────

export const GAME_CONFIG = [
  { key: 'elmStreet' as GameType, label: 'אלם סטריט',   slots: ELM_STREET_SLOTS, color: 'amber'  as const },
  { key: 'butchery'  as GameType, label: 'הקצביה',      slots: SHARED_SLOTS,     color: 'rose'   as const },
  { key: 'wrongTurn' as GameType, label: 'טעות בכיוון', slots: SHARED_SLOTS,     color: 'violet' as const },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GameBookings {
  date:      string
  elmStreet: string[]
  butchery:  string[]
  wrongTurn: string[]
}

export function createEmptyBookings(date: string): GameBookings {
  return { date, elmStreet: [], butchery: [], wrongTurn: [] }
}

// ── DB row → app type ─────────────────────────────────────────────────────────

type DbRow = {
  date: string
  elm_street_slots: string[] | null
  butchery_slots:   string[] | null
  wrong_turn_slots: string[] | null
}

function rowToBookings(row: DbRow): GameBookings {
  return {
    date:      row.date,
    elmStreet: row.elm_street_slots ?? [],
    butchery:  row.butchery_slots   ?? [],
    wrongTurn: row.wrong_turn_slots  ?? [],
  }
}

// Maintain original slot ordering when persisting selections
function sortSlots(selected: string[], allSlots: readonly string[]): string[] {
  return [...selected].sort((a, b) => allSlots.indexOf(a) - allSlots.indexOf(b))
}

// ── Supabase access ───────────────────────────────────────────────────────────

export async function getBookingsForDates(
  dates: string[],
): Promise<Record<string, GameBookings>> {
  if (dates.length === 0) return {}
  const { data } = await supabase
    .from('game_bookings')
    .select('date, elm_street_slots, butchery_slots, wrong_turn_slots')
    .in('date', dates)
  const result: Record<string, GameBookings> = {}
  for (const row of data ?? []) result[row.date] = rowToBookings(row as DbRow)
  return result
}

export async function saveBookingsForDate(
  date: string,
  bookings: Omit<GameBookings, 'date'>,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('game_bookings').upsert(
    {
      date,
      elm_street_slots: sortSlots(bookings.elmStreet, ELM_STREET_SLOTS),
      butchery_slots:   sortSlots(bookings.butchery,  SHARED_SLOTS),
      wrong_turn_slots: sortSlots(bookings.wrongTurn,  SHARED_SLOTS),
    },
    { onConflict: 'date' },
  )
  return { error: error ? new Error(error.message) : null }
}
