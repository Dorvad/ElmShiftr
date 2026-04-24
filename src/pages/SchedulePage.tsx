import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, type ApprovedShift, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, groupByDate } from '../lib/dateHelpers'
import { LoadingState, EmptyState, ShiftBadge, EmployeeAvatar, EmployeeLightbox, Spinner } from '../components/ui'
import {
  GAME_CONFIG, type GameBookings, type GameType,
  createEmptyBookings, getBookingsForDates, saveBookingsForDate,
} from '../lib/gameBookings'

type ViewMode    = 'list' | 'calendar'
type ShiftFilter = 'all' | ShiftType

type SlotData = {
  date:      string
  shiftType: ShiftType
  workers:   ApprovedShift[]
}

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

// ── Color helpers (Tailwind classes per game) ─────────────────────────────────

type GameColor = 'amber' | 'rose' | 'violet'

const PILL_CLS: Record<GameColor, string> = {
  amber:  'bg-amber-100  text-amber-800',
  rose:   'bg-rose-100   text-rose-800',
  violet: 'bg-violet-100 text-violet-800',
}

const LABEL_CLS: Record<GameColor, string> = {
  amber:  'text-amber-700',
  rose:   'text-rose-700',
  violet: 'text-violet-700',
}

const BADGE_CLS: Record<GameColor, string> = {
  amber:  'bg-amber-100  text-amber-700',
  rose:   'bg-rose-100   text-rose-700',
  violet: 'bg-violet-100 text-violet-700',
}

const CHIP_ON_CLS: Record<GameColor, string> = {
  amber:  'bg-amber-500  border-amber-500  text-white',
  rose:   'bg-rose-600   border-rose-600   text-white',
  violet: 'bg-violet-600 border-violet-600 text-white',
}

const CHIP_OFF_CLS = 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'

// ── BookedGamesSection ────────────────────────────────────────────────────────
// Handles both read (display) and write (edit) for one date's game bookings.

function BookedGamesSection({ date, bookings }: {
  date:     string
  bookings: GameBookings | undefined
}) {
  // Local saved copy — updated optimistically after save, and via prop sync
  const [saved,    setSaved]    = useState<GameBookings>(bookings ?? createEmptyBookings(date))
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState<Omit<GameBookings, 'date'>>({ elmStreet: [], butchery: [], wrongTurn: [] })
  const [saving,    setSaving]    = useState(false)
  const [showOK,    setShowOK]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync from parent (realtime from other clients) when not mid-edit
  useEffect(() => {
    if (!editing && bookings) setSaved(bookings)
  }, [bookings, editing])

  const totalBooked = saved.elmStreet.length + saved.butchery.length + saved.wrongTurn.length

  const startEdit = () => {
    setDraft({ elmStreet: [...saved.elmStreet], butchery: [...saved.butchery], wrongTurn: [...saved.wrongTurn] })
    setEditing(true)
    setShowOK(false)
  }

  const cancelEdit = () => setEditing(false)

  const toggleSlot = (game: GameType, slot: string) =>
    setDraft(prev => ({
      ...prev,
      [game]: prev[game].includes(slot)
        ? prev[game].filter(s => s !== slot)
        : [...prev[game], slot],
    }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const { error } = await saveBookingsForDate(date, draft)
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaved({ date, ...draft })
    setEditing(false)
    setShowOK(true)
    setTimeout(() => setShowOK(false), 3000)
  }

  // ── Display view ────────────────────────────────────────────────────────────

  if (!editing) {
    return (
      <div className="border-t border-ink-100 bg-parchment/30 px-5 py-4">
        {/* Row: label + success flash + edit button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-ink-400">
              משחקים שהוזמנו
            </p>
            {showOK && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 animate-fade-in">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                נשמר
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-ink-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            עדכן
          </button>
        </div>

        {totalBooked === 0 ? (
          <p className="text-xs text-ink-400 italic">אין משחקים מעודכנים כרגע</p>
        ) : (
          <div className="flex flex-col gap-2">
            {GAME_CONFIG.filter(g => saved[g.key].length > 0).map(game => (
              <div key={game.key} className="flex items-start gap-3">
                <span className={`text-xs font-semibold w-24 shrink-0 pt-0.5 leading-snug ${LABEL_CLS[game.color]}`}>
                  {game.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {saved[game.key].map(slot => (
                    <span
                      key={slot}
                      className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${PILL_CLS[game.color]}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Edit view ───────────────────────────────────────────────────────────────

  return (
    <div className="border-t-2 border-ink-200">
      {/* Editor header */}
      <div className="px-5 py-3.5 bg-ink-50 border-b border-ink-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">עדכון הזמנות</p>
        <button
          type="button"
          onClick={cancelEdit}
          className="text-xs text-ink-400 hover:text-ink-700 transition-colors flex items-center gap-1"
        >
          ✕ ביטול
        </button>
      </div>

      {/* Game sections */}
      <div className="px-5 py-5 flex flex-col gap-6 bg-white">
        {GAME_CONFIG.map(game => {
          const count = draft[game.key].length
          return (
            <div key={game.key}>
              {/* Game label + count badge */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-xs font-bold ${LABEL_CLS[game.color]}`}>{game.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${BADGE_CLS[game.color]}`}>
                    {count}
                  </span>
                )}
              </div>

              {/* Slot chips */}
              <div className="flex flex-wrap gap-1.5">
                {game.slots.map(slot => {
                  const on = draft[game.key].includes(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(game.key, slot)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all duration-100 active:scale-[0.97] ${
                        on ? CHIP_ON_CLS[game.color] : CHIP_OFF_CLS
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save */}
      <div className="px-5 pb-5 bg-white">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? <><Spinner size="sm" />שומר...</> : 'שמור הזמנות'}
        </button>
        {saveError && (
          <p className="text-xs text-red-600 font-mono mt-2 px-1">
            שגיאה: {saveError}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [shifts,         setShifts]         = useState<ApprovedShift[]>([])
  const [bookingsByDate, setBookingsByDate]  = useState<Record<string, GameBookings>>({})
  const [loading,        setLoading]        = useState(true)
  const [lastUpdated,    setLastUpdated]    = useState(new Date())
  const [selectedName,       setSelectedName]      = useState('all')
  const [selectedShiftType,  setSelectedShiftType] = useState<ShiftFilter>('all')
  const [viewMode,       setViewMode]       = useState<ViewMode>('list')
  const [lightboxName,   setLightboxName]   = useState<string | null>(null)
  const [calendarMonth,  setCalendarMonth]  = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchAll = useCallback(async () => {
    const { data: shiftsData } = await supabase
      .from('approved_shifts').select('*').eq('status', 'approved').order('date').order('shift_type')
    const newShifts = (shiftsData ?? []) as ApprovedShift[]
    setShifts(newShifts)

    const dates = Array.from(new Set(newShifts.map(s => s.date)))
    const bookings = dates.length > 0 ? await getBookingsForDates(dates) : {}
    setBookingsByDate(bookings)

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('schedule_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approved_shifts' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_bookings' },   fetchAll)
      .subscribe()
    const interval = setInterval(fetchAll, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchAll])

  const uniqueNames = useMemo(
    () => Array.from(new Set(shifts.map(s => s.name))).sort((a, b) => a.localeCompare(b, 'he')),
    [shifts],
  )

  const filteredShifts = useMemo(
    () => shifts.filter(s =>
      (selectedName      === 'all' || s.name       === selectedName) &&
      (selectedShiftType === 'all' || s.shift_type === selectedShiftType),
    ),
    [shifts, selectedName, selectedShiftType],
  )

  // date+shiftType slots with their workers
  const slotData = useMemo<SlotData[]>(() => {
    const map = new Map<string, SlotData>()
    for (const shift of filteredShifts) {
      const key = `${shift.date}|${shift.shift_type}`
      if (!map.has(key)) map.set(key, { date: shift.date, shiftType: shift.shift_type as ShiftType, workers: [] })
      map.get(key)!.workers.push(shift)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.shiftType === 'morning' ? -1 : 1,
    )
  }, [filteredShifts])

  const slotsByDate = useMemo(() => {
    const result = new Map<string, SlotData[]>()
    for (const slot of slotData) {
      if (!result.has(slot.date)) result.set(slot.date, [])
      result.get(slot.date)!.push(slot)
    }
    return result
  }, [slotData])

  const sortedDates = Array.from(slotsByDate.keys()).sort()

  // Calendar helpers
  const today    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const todayStr = toDateKey(today)
  const grouped  = groupByDate(filteredShifts)

  const monthLabel = calendarMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  const calendarCells = useMemo(() => {
    const firstDay     = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const startWeekDay = firstDay.getDay()
    const gridStart    = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - startWeekDay)
    return Array.from({ length: 42 }, (_, idx) => {
      const date    = new Date(gridStart)
      date.setDate(gridStart.getDate() + idx)
      const dateKey = toDateKey(date)
      return { date, dateKey, isCurrentMonth: date.getMonth() === calendarMonth.getMonth(), shifts: grouped[dateKey] || [] }
    })
  }, [calendarMonth, grouped])

  const goPrevMonth = () => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))
  const goNextMonth = () => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))

  if (loading) return <LoadingState message="טוען לוח משמרות..." />

  return (
    <div className="animate-fade-in">
      {lightboxName && (
        <EmployeeLightbox name={lightboxName} onClose={() => setLightboxName(null)} />
      )}

      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-header mb-1">{t.pages.schedule.title}</h1>
          <p className="text-ink-500">{t.pages.schedule.subtitle}</p>
        </div>
        <span className="text-xs font-mono text-ink-400 whitespace-nowrap shrink-0">
          {t.pages.schedule.lastUpdated}: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">סינון לפי שם</label>
            <select className="input" value={selectedName} onChange={e => setSelectedName(e.target.value)}>
              <option value="all">כל העובדים</option>
              {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">סינון לפי משמרת</label>
            <select className="input" value={selectedShiftType} onChange={e => setSelectedShiftType(e.target.value as ShiftFilter)}>
              <option value="all">בוקר + ערב</option>
              <option value="morning">בוקר</option>
              <option value="evening">ערב</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">תצוגה</label>
            <div className="grid grid-cols-2 gap-2">
              {(['list', 'calendar'] as ViewMode[]).map(mode => (
                <button
                  key={mode} type="button" onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    viewMode === mode ? 'border-ink-700 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600 bg-white'
                  }`}
                >
                  {mode === 'list' ? 'רשימה' : 'לוח שנה'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── List view ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' ? (
        slotData.length === 0 ? (
          <EmptyState title={t.pages.schedule.empty} description={t.pages.schedule.emptyDesc} />
        ) : (
          <div className="flex flex-col gap-4">
            {sortedDates.map(date => {
              const isToday = date === todayStr
              const slots   = slotsByDate.get(date)!
              return (
                <div key={date} className={`card overflow-hidden ${isToday ? 'ring-1 ring-yellow-300' : ''}`}>

                  {/* Date header */}
                  <div className={`px-5 py-3 border-b border-ink-100 flex items-center gap-3 ${isToday ? 'bg-yellow-50' : 'bg-parchment/40'}`}>
                    <span className="font-display font-semibold text-ink-800">{formatDateHebrew(date)}</span>
                    {isToday && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">היום</span>
                    )}
                  </div>

                  {/* Shift slots: morning then evening */}
                  {slots.map((slot, idx) => (
                    <div
                      key={`${slot.date}|${slot.shiftType}`}
                      className={`px-5 py-4 flex items-center gap-4 flex-wrap ${idx > 0 ? 'border-t border-ink-100' : ''}`}
                    >
                      <div className="shrink-0">
                        <ShiftBadge type={slot.shiftType} />
                      </div>
                      <div className="flex items-center gap-5 flex-wrap">
                        {slot.workers.map(w => (
                          <div key={w.id} className="flex items-center gap-2.5">
                            <EmployeeAvatar
                              name={w.name}
                              shiftType={slot.shiftType}
                              size="sm"
                              onClick={() => setLightboxName(w.name)}
                            />
                            <div>
                              <p className="text-sm font-medium text-ink-800 leading-tight">{w.name}</p>
                              {w.notes && (
                                <p className="text-xs text-ink-400 italic leading-tight mt-0.5">{w.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Booked games — one section per date, at the bottom */}
                  <BookedGamesSection
                    date={date}
                    bookings={bookingsByDate[date]}
                  />
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ── Calendar view ────────────────────────────────────────────────── */
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <button type="button" className="btn-secondary text-sm px-3 py-2" onClick={goPrevMonth}>◀</button>
            <h2 className="font-display text-lg font-semibold text-ink-900">{monthLabel}</h2>
            <button type="button" className="btn-secondary text-sm px-3 py-2" onClick={goNextMonth}>▶</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono text-ink-500 mb-2">
            {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(cell => {
              const isToday = cell.dateKey === todayStr
              const bk = bookingsByDate[cell.dateKey]
              const hasGames = bk && (bk.elmStreet.length + bk.butchery.length + bk.wrongTurn.length) > 0
              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-24 rounded-lg border p-1.5 ${
                    cell.isCurrentMonth ? 'bg-white border-ink-100' : 'bg-ink-50 border-ink-100 opacity-50'
                  } ${isToday ? 'ring-1 ring-yellow-300' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-ink-500">{cell.date.getDate()}</span>
                    {hasGames && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="יש הזמנות" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {cell.shifts.slice(0, 3).map(shift => (
                      <div key={shift.id} className={`text-[11px] rounded px-1 py-0.5 border truncate ${
                        shift.shift_type === 'morning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      }`}>
                        {shift.name} · {shift.shift_type === 'morning' ? 'בוקר' : 'ערב'}
                      </div>
                    ))}
                    {cell.shifts.length > 3 && (
                      <div className="text-[10px] text-ink-400">+{cell.shifts.length - 3} נוספות</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
