import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase, type ApprovedShift, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, groupByDate } from '../lib/dateHelpers'
import { LoadingState, EmptyState, ShiftBadge, EmployeeAvatar, EmployeeLightbox } from '../components/ui'
import { BookedGamesPanel } from '../components/BookedGamesPanel'
import { createEmptyBookingsForDate, getBookingsForDates, type BookingsByDate } from '../lib/gameBookings'

type ViewMode   = 'list' | 'calendar'
type ShiftFilter = 'all' | ShiftType

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function SchedulePage() {
  const [shifts, setShifts]           = useState<ApprovedShift[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [selectedName, setSelectedName]           = useState('all')
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftFilter>('all')
  const [viewMode, setViewMode]       = useState<ViewMode>('list')
  const [lightboxName, setLightboxName] = useState<string | null>(null)
  const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({})
  const sortedDatesRef = useRef<string[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })


  const loadBookings = useCallback(async (dates: string[]) => {
    try {
      const data = await getBookingsForDates(dates)
      setBookingsByDate(data)
    } catch {
      setBookingsByDate(dates.reduce<BookingsByDate>((acc, date) => {
        acc[date] = createEmptyBookingsForDate()
        return acc
      }, {}))
    }
  }, [])

  const fetchShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from('approved_shifts')
      .select('*')
      .eq('status', 'approved')
      .order('date',       { ascending: true })
      .order('shift_type', { ascending: true })
    if (!error && data) {
      setShifts(data as ApprovedShift[])
      setLastUpdated(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchShifts()
    const channel = supabase
      .channel('schedule_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approved_shifts' }, fetchShifts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_bookings' }, () => { void loadBookings(sortedDatesRef.current) })
      .subscribe()
    const interval = setInterval(fetchShifts, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchShifts, loadBookings])

  const uniqueNames = useMemo(
    () => Array.from(new Set(shifts.map(s => s.name))).sort((a, b) => a.localeCompare(b, 'he')),
    [shifts],
  )

  const filteredShifts = useMemo(
    () => shifts.filter(s => {
      const matchesName = selectedName      === 'all' || s.name       === selectedName
      const matchesType = selectedShiftType === 'all' || s.shift_type === selectedShiftType
      return matchesName && matchesType
    }),
    [shifts, selectedName, selectedShiftType],
  )

  const grouped      = groupByDate(filteredShifts)
  const sortedDates  = Object.keys(grouped).sort()


  useEffect(() => {
    sortedDatesRef.current = sortedDates
    void loadBookings(sortedDates)
  }, [loadBookings, sortedDates])

  const today    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const todayStr = toDateKey(today)

  const toggle = (date: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

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
      return {
        date,
        dateKey,
        isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
        shifts: grouped[dateKey] || [],
      }
    })
  }, [calendarMonth, grouped])

  const goPrevMonth = () => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))
  const goNextMonth = () => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))

  if (loading) return <LoadingState message="טוען לוח משמרות..." />

  return (
    <div className="animate-fade-in">
      {/* Lightbox — portal-rendered, shown when a portrait is tapped */}
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
                    viewMode === mode
                      ? 'border-ink-700 bg-ink-50 text-ink-900'
                      : 'border-ink-200 text-ink-600 bg-white'
                  }`}
                >
                  {mode === 'list' ? 'רשימה' : 'לוח שנה'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <EmptyState title={t.pages.schedule.empty} description={t.pages.schedule.emptyDesc} />
      ) : viewMode === 'list' ? (
        <>
          {/* ── Desktop table ─────────────────────────────────────────── */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-parchment border-b border-ink-100">
                  {['תאריך', 'משחקים שהוזמנו', 'עובד', 'משמרת', 'הערות'].map(h => (
                    <th key={h} className="text-right px-5 py-3 text-xs font-mono text-ink-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDates.map(date => {
                  const isToday = date === todayStr
                  const dayBookings = bookingsByDate[date] ?? createEmptyBookingsForDate()
                  return grouped[date].map((shift, idx) => (
                    <tr key={shift.id} className={`${idx === grouped[date].length - 1 ? 'border-b border-ink-100' : 'border-b border-ink-50'} hover:bg-parchment/40 transition-colors`}>
                      {idx === 0 && (<>
                        <td
                          className={`px-5 py-4 font-display font-semibold text-sm align-middle ${
                            isToday ? 'bg-yellow-50 text-yellow-900' : 'text-ink-700'
                          }`}
                          rowSpan={grouped[date].length}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{formatDateHebrew(date)}</span>
                            {isToday && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
                                היום
                              </span>
                            )}
                          </div>
                        </td>
                        <td rowSpan={grouped[date].length} className="px-3 py-3 align-top border-l border-ink-50 min-w-[260px]">
                          <BookedGamesPanel bookings={dayBookings} />
                        </td>
                      </>)}

                      {/* Employee cell — avatar + name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar
                            name={shift.name}
                            shiftType={shift.shift_type as ShiftType}
                            size="sm"
                            onClick={() => setLightboxName(shift.name)}
                          />
                          <span className="font-medium text-ink-900">{shift.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <ShiftBadge type={shift.shift_type as ShiftType} />
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-400">{shift.notes || '—'}</td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile accordion ──────────────────────────────────────── */}
          <div className="md:hidden flex flex-col gap-3">
            {sortedDates.map(date => {
              const isOpen  = expanded.has(date)
              const isToday = date === todayStr

              return (
                <div
                  key={date}
                  className={`card overflow-hidden ${isToday ? 'ring-1 ring-yellow-300 bg-yellow-50/40' : ''}`}
                >
                  <button
                    onClick={() => toggle(date)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-parchment/40 transition-colors text-right"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold text-ink-800 text-sm">
                        {formatDateHebrew(date)}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
                          היום
                        </span>
                      )}
                      <span className="text-xs font-mono text-ink-400">{grouped[date].length} משמרות</span>
                    </div>
                    <span className={`text-ink-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-ink-100 divide-y divide-ink-50">
                      <div className="px-4 py-1">
                        <BookedGamesPanel bookings={bookingsByDate[date] ?? createEmptyBookingsForDate()} />
                      </div>
                      {grouped[date].map(shift => (
                        <div key={shift.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                          {/* Avatar + name + notes */}
                          <div className="flex items-center gap-3 min-w-0">
                            <EmployeeAvatar
                              name={shift.name}
                              shiftType={shift.shift_type as ShiftType}
                              size="sm"
                              onClick={() => setLightboxName(shift.name)}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-ink-900">{shift.name}</p>
                              {shift.notes && (
                                <p className="text-xs text-ink-400 mt-0.5 truncate">{shift.notes}</p>
                              )}
                            </div>
                          </div>
                          <ShiftBadge type={shift.shift_type as ShiftType} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* ── Calendar view ──────────────────────────────────────────── */
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
