import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase, type ApprovedShift, type ShiftType, type ShiftGame } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, groupByDate } from '../lib/dateHelpers'
import { LoadingState, EmptyState, ShiftBadge, EmployeeAvatar, EmployeeLightbox, Spinner } from '../components/ui'

type ViewMode   = 'list' | 'calendar'
type ShiftFilter = 'all' | ShiftType

type SlotData = {
  date: string
  shiftType: ShiftType
  workers: ApprovedShift[]
  games: ShiftGame[]
}

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

// ── Games panel for a single shift slot ──────────────────────────────────────

function ShiftGamesPanel({
  slot,
  onGameAdded,
  onGameRemoved,
}: {
  slot: SlotData
  onGameAdded: (game: ShiftGame) => void
  onGameRemoved: (id: string) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [adding,  setAdding]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEvening  = slot.shiftType === 'evening'
  const sortedGames = [...slot.games].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  )

  const accentBg   = isEvening ? 'bg-indigo-50/30 border-indigo-100' : 'bg-amber-50/30 border-amber-100'
  const chipCls    = isEvening ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-amber-50 border-amber-200 text-amber-800'
  const btnCls     = isEvening ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
  const labelColor = isEvening ? 'text-indigo-400' : 'text-amber-500'

  const addGame = async () => {
    const name = inputValue.trim()
    if (!name || adding) return
    if (slot.games.some(g => g.game_name.toLowerCase() === name.toLowerCase())) {
      setError('משחק זה כבר ברשימה')
      return
    }
    setAdding(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('shift_games')
      .insert({ shift_date: slot.date, shift_type: slot.shiftType, game_name: name, sort_order: slot.games.length })
      .select()
      .single()
    setAdding(false)
    if (err) {
      setError(err.code === '23505' ? 'משחק זה כבר ברשימה' : 'שגיאה בהוספה')
      return
    }
    if (data) onGameAdded(data as ShiftGame)
    setInputValue('')
    setSuccess(true)
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccess(false), 2500)
    inputRef.current?.focus()
  }

  const removeGame = async (game: ShiftGame) => {
    const { error: err } = await supabase.from('shift_games').delete().eq('id', game.id)
    if (!err) onGameRemoved(game.id)
  }

  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current) }, [])

  return (
    <div className={`border-t px-5 py-4 ${accentBg}`}>
      <p className={`text-[11px] font-mono font-semibold uppercase tracking-widest mb-3 ${labelColor}`}>
        משחקים שהוזמנו
      </p>

      {/* Game chips */}
      {sortedGames.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {sortedGames.map((game, i) => (
            <div
              key={game.id}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${chipCls}`}
            >
              <span className="font-mono opacity-40">{i + 1}.</span>
              <span>{game.game_name}</span>
              <button
                type="button"
                onClick={() => removeGame(game)}
                aria-label="הסר משחק"
                className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded-full text-current hover:bg-red-100 hover:text-red-600 font-bold text-sm leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {sortedGames.length === 0 && (
        <p className="text-xs text-ink-400 italic mb-3">אין משחקים שהוזמנו עדיין</p>
      )}

      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="input text-sm py-2 flex-1"
          placeholder="הוסף שם משחק..."
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGame() } }}
          disabled={adding}
        />
        <button
          type="button"
          onClick={addGame}
          disabled={!inputValue.trim() || adding}
          className={`flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold transition-all duration-150 active:scale-95 disabled:opacity-40 shrink-0 ${btnCls}`}
        >
          {adding ? <Spinner size="sm" /> : '+'}
        </button>
      </div>

      {success && (
        <p className="text-xs text-emerald-600 font-mono font-semibold mt-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          המשחק נוסף בהצלחה
        </p>
      )}
      {error && <p className="text-xs text-red-500 font-mono mt-1.5">{error}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [shifts,     setShifts]     = useState<ApprovedShift[]>([])
  const [shiftGames, setShiftGames] = useState<ShiftGame[]>([])
  const [loading,    setLoading]    = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [selectedName,      setSelectedName]      = useState('all')
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftFilter>('all')
  const [viewMode,  setViewMode]  = useState<ViewMode>('list')
  const [lightboxName, setLightboxName] = useState<string | null>(null)
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({})
  const sortedDatesRef = useRef<string[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchAll = useCallback(async () => {
    const [shiftsRes, gamesRes] = await Promise.all([
      supabase.from('approved_shifts').select('*').eq('status', 'approved').order('date').order('shift_type'),
      supabase.from('shift_games').select('*').order('sort_order').order('created_at'),
    ])
    if (shiftsRes.data) setShifts(shiftsRes.data as ApprovedShift[])
    if (gamesRes.data)  setShiftGames(gamesRes.data as ShiftGame[])
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('schedule_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approved_shifts' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_games' }, fetchAll)
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

  // Slot-based grouping: date+shiftType → workers + games
  const slotData = useMemo<SlotData[]>(() => {
    const map = new Map<string, SlotData>()
    for (const shift of filteredShifts) {
      const key = `${shift.date}|${shift.shift_type}`
      if (!map.has(key)) {
        map.set(key, {
          date: shift.date,
          shiftType: shift.shift_type as ShiftType,
          workers: [],
          games: shiftGames.filter(g => g.shift_date === shift.date && g.shift_type === shift.shift_type),
        })
      }
      map.get(key)!.workers.push(shift)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.shiftType === 'morning' ? -1 : 1,
    )
  }, [filteredShifts, shiftGames])

  const slotsByDate = useMemo(() => {
    const result = new Map<string, SlotData[]>()
    for (const slot of slotData) {
      if (!result.has(slot.date)) result.set(slot.date, [])
      result.get(slot.date)!.push(slot)
    }
    return result
  }, [slotData])

  const sortedDates = Array.from(slotsByDate.keys()).sort()

  // Optimistic updates so UI feels instant
  const handleGameAdded = useCallback((game: ShiftGame) => {
    setShiftGames(prev => [...prev.filter(g => g.id !== game.id), game])
  }, [])

  const handleGameRemoved = useCallback((id: string) => {
    setShiftGames(prev => prev.filter(g => g.id !== id))
  }, [])

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
              {uniqueNames.map(name => <option key={name} value={name}>{name}</option>)}
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
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
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

                  {/* Shift slots */}
                  {slots.map((slot, slotIdx) => (
                    <div key={`${slot.date}|${slot.shiftType}`} className={slotIdx > 0 ? 'border-t-2 border-ink-100' : ''}>
                      {/* Workers row */}
                      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
                        <ShiftBadge type={slot.shiftType} />
                        <div className="flex items-center gap-4 flex-wrap">
                          {slot.workers.map(w => (
                            <div key={w.id} className="flex items-center gap-2">
                              <EmployeeAvatar
                                name={w.name}
                                shiftType={slot.shiftType}
                                size="sm"
                                onClick={() => setLightboxName(w.name)}
                              />
                              <div>
                                <p className="text-sm font-medium text-ink-800">{w.name}</p>
                                {w.notes && <p className="text-xs text-ink-400 italic">{w.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Games panel */}
                      <ShiftGamesPanel
                        slot={slot}
                        onGameAdded={handleGameAdded}
                        onGameRemoved={handleGameRemoved}
                      />
                    </div>
                  ))}
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
            {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(day => <div key={day}>{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(cell => {
              const isToday = cell.dateKey === todayStr
              return (
                <div
                  key={cell.dateKey}
                  className={`min-h-24 rounded-lg border p-1.5 ${
                    cell.isCurrentMonth ? 'bg-white border-ink-100' : 'bg-ink-50 border-ink-100 opacity-50'
                  } ${isToday ? 'ring-1 ring-yellow-300' : ''}`}
                >
                  <div className="text-xs font-mono text-ink-500 mb-1">{cell.date.getDate()}</div>
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
