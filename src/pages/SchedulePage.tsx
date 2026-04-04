import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, type ApprovedShift, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, groupByDate } from '../lib/dateHelpers'
import { LoadingState, EmptyState, ShiftBadge } from '../components/ui'

type ViewMode = 'list' | 'calendar'
type ShiftFilter = 'all' | ShiftType

const ISRAEL_TZ = 'Asia/Jerusalem'

function toDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export default function SchedulePage() {
  const [shifts, setShifts] = useState<ApprovedShift[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedName, setSelectedName] = useState('all')
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
    const year = Number(parts.find(p => p.type === 'year')!.value)
    const month = Number(parts.find(p => p.type === 'month')!.value) - 1
    return new Date(year, month, 1)
  })

  const fetchShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from('approved_shifts')
      .select('*')
      .eq('status', 'approved')
      .order('date', { ascending: true })
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
      .subscribe()
    const interval = setInterval(fetchShifts, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchShifts])

  const uniqueNames = useMemo(
    () => Array.from(new Set(shifts.map(shift => shift.name))).sort((a, b) => a.localeCompare(b, 'he')),
    [shifts],
  )

  const filteredShifts = useMemo(
    () => shifts.filter(shift => {
      const matchesName = selectedName === 'all' || shift.name === selectedName
      const matchesType = selectedShiftType === 'all' || shift.shift_type === selectedShiftType
      return matchesName && matchesType
    }),
    [shifts, selectedName, selectedShiftType],
  )

  const grouped = groupByDate(filteredShifts)
  const sortedDates = Object.keys(grouped).sort()

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_TZ }).format(new Date())

  const toggle = (date: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  const monthLabel = calendarMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const startWeekDay = firstDay.getDay()
    const gridStart = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - startWeekDay)

    return Array.from({ length: 42 }, (_, idx) => {
      const date = new Date(gridStart)
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

  const goPrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  if (loading) return <LoadingState message="טוען לוח משמרות..." />

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-header mb-1">{t.pages.schedule.title}</h1>
          <p className="text-ink-500">{t.pages.schedule.subtitle}</p>
        </div>
        <span className="text-xs font-mono text-ink-400 whitespace-nowrap shrink-0">
          {t.pages.schedule.lastUpdated}: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="card p-4 mb-4 flex flex-col gap-3">
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
            <select
              className="input"
              value={selectedShiftType}
              onChange={e => setSelectedShiftType(e.target.value as ShiftFilter)}
            >
              <option value="all">בוקר + ערב</option>
              <option value="morning">בוקר</option>
              <option value="evening">ערב</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">תצוגה</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  viewMode === 'list' ? 'border-ink-700 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600 bg-white'
                }`}
              >
                רשימה
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  viewMode === 'calendar' ? 'border-ink-700 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600 bg-white'
                }`}
              >
                לוח שנה
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <EmptyState title={t.pages.schedule.empty} description={t.pages.schedule.emptyDesc} />
      ) : viewMode === 'list' ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-parchment border-b border-ink-100">
                  <th className="text-right px-5 py-3 text-xs font-mono text-ink-500 uppercase tracking-wider">תאריך</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-ink-500 uppercase tracking-wider">שם</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-ink-500 uppercase tracking-wider">משמרת</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-ink-500 uppercase tracking-wider">הערות</th>
                </tr>
              </thead>
              <tbody>
                {sortedDates.map(date => {
                  const isToday = date === todayStr

                  return grouped[date].map((shift, idx) => (
                    <tr key={shift.id} className="border-b border-ink-50 hover:bg-parchment/40 transition-colors">
                      {idx === 0 && (
                        <td
                          className={`px-5 py-3.5 font-display font-semibold text-sm align-top ${
                            isToday
                              ? 'bg-yellow-100 text-yellow-900 ring-1 ring-yellow-300'
                              : 'text-ink-700'
                          }`}
                          rowSpan={grouped[date].length}
                        >
                          <div className="flex items-center gap-2">
                            <span>{formatDateHebrew(date)}</span>
                            {isToday && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
                                היום
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 font-medium text-ink-900">{shift.name}</td>
                      <td className="px-5 py-3.5"><ShiftBadge type={shift.shift_type as ShiftType} /></td>
                      <td className="px-5 py-3.5 text-sm text-ink-400">{shift.notes || '—'}</td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile accordion */}
          <div className="md:hidden flex flex-col gap-3">
            {sortedDates.map(date => {
              const isOpen = expanded.has(date)
              const isToday = date === todayStr

              return (
                <div
                  key={date}
                  className={`card overflow-hidden ${
                    isToday ? 'ring-1 ring-yellow-300 bg-yellow-50/40' : ''
                  }`}
                >
                  <button
                    onClick={() => toggle(date)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-parchment/40 transition-colors text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-ink-800 text-sm">
                          {formatDateHebrew(date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
                            היום
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-ink-400">{grouped[date].length} משמרות</span>
                    </div>
                    <span className={`text-ink-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-ink-100 divide-y divide-ink-50">
                      {grouped[date].map(shift => (
                        <div key={shift.id} className="px-4 py-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-ink-900">{shift.name}</p>
                            {shift.notes && <p className="text-sm text-ink-400 mt-0.5">{shift.notes}</p>}
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
                      <div key={shift.id} className="text-[11px] rounded px-1 py-0.5 bg-parchment border border-ink-100 truncate">
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
