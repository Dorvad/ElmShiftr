import { useEffect, useMemo, useState } from 'react'
import {
  type BookingsForDate,
  type GameType,
  GAME_CONFIG,
  createEmptyBookingsForDate,
  getBookingsForDate,
  getGameSlots,
  saveBookingsForDate,
} from '../lib/gameBookings'
import { Alert } from './ui'

function getTodayDateKey() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  return now.toISOString().split('T')[0]
}

function slotsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((slot, index) => slot === b[index])
}

function bookingsEqual(a: BookingsForDate, b: BookingsForDate): boolean {
  return slotsEqual(a.elmStreet, b.elmStreet)
    && slotsEqual(a.butchery, b.butchery)
    && slotsEqual(a.wrongTurn, b.wrongTurn)
}

export function BookingEditor() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey)
  const [draftBookings, setDraftBookings] = useState<BookingsForDate>(() => getBookingsForDate(getTodayDateKey()))
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const savedForDate = useMemo(() => getBookingsForDate(selectedDate), [selectedDate])
  const hasUnsavedChanges = useMemo(() => !bookingsEqual(savedForDate, draftBookings), [savedForDate, draftBookings])

  useEffect(() => {
    setDraftBookings(savedForDate)
    setSavedMessage(null)
  }, [savedForDate])

  useEffect(() => {
    if (!savedMessage) return
    const timer = window.setTimeout(() => setSavedMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [savedMessage])

  const toggleSlot = (gameType: GameType, time: string) => {
    const orderedSlots = getGameSlots(gameType)

    setDraftBookings(prev => {
      const existing = new Set(prev[gameType])
      if (existing.has(time)) existing.delete(time)
      else existing.add(time)

      return {
        ...prev,
        [gameType]: orderedSlots.filter(slot => existing.has(slot)),
      }
    })
  }

  const clearGame = (gameType: GameType) => {
    setDraftBookings(prev => ({ ...prev, [gameType]: [] }))
  }

  const copyFromPreviousDay = () => {
    const current = new Date(`${selectedDate}T00:00:00`)
    current.setDate(current.getDate() - 1)
    const prevDate = current.toISOString().split('T')[0]
    setDraftBookings(getBookingsForDate(prevDate))
  }

  const save = () => {
    saveBookingsForDate(selectedDate, draftBookings)
    setSavedMessage('עודכן בהצלחה')
  }

  const gameOrder: GameType[] = ['elmStreet', 'butchery', 'wrongTurn']
  const handleDateChange = (nextDate: string) => {
    if (hasUnsavedChanges && nextDate !== selectedDate) {
      const shouldDiscard = window.confirm('יש שינויים שלא נשמרו. לעבור תאריך ולבטל אותם?')
      if (!shouldDiscard) return
    }

    setSelectedDate(nextDate)
  }

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="w-full md:max-w-xs">
          <label className="label">בחר תאריך</label>
          <input
            type="date"
            className="input"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </div>

        <button type="button" className="btn-secondary w-full md:w-auto" onClick={copyFromPreviousDay}>
          העתק מהיום הקודם
        </button>
      </div>

      {savedMessage && <Alert type="success" message={savedMessage} />}

      {gameOrder.map((gameType) => {
        const config = GAME_CONFIG[gameType]
        const selectedSlots = draftBookings[gameType]
        const allSlots = getGameSlots(gameType)

        return (
          <section key={gameType} className="border border-ink-100 rounded-2xl p-4 bg-parchment/35">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display text-lg font-semibold text-ink-900">{config.label}</h3>
              <button
                type="button"
                onClick={() => clearGame(gameType)}
                className="text-sm text-ink-500 hover:text-ink-800 underline"
              >
                נקה הכל
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {allSlots.map((slot) => {
                const isSelected = selectedSlots.includes(slot)

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(gameType, slot)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-mono transition-all ${
                      isSelected
                        ? `${config.chipClass} shadow-sm`
                        : 'bg-white border-ink-200 text-ink-600 hover:border-ink-300'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="flex flex-col md:flex-row gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => setDraftBookings(createEmptyBookingsForDate())}
          className="btn-secondary w-full md:w-auto"
        >
          אפס הכל
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasUnsavedChanges}
          className="btn-primary w-full md:w-auto"
        >
          שמור שיבוצים
        </button>
      </div>
    </div>
  )
}
