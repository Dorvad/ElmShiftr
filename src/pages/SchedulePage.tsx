import { useEffect, useState, useCallback } from 'react'
import { supabase, type ApprovedShift, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, groupByDate } from '../lib/dateHelpers'
import { LoadingState, EmptyState, ShiftBadge } from '../components/ui'

export default function SchedulePage() {
  const [shifts, setShifts] = useState<ApprovedShift[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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

  const grouped = groupByDate(shifts)
  const sortedDates = Object.keys(grouped).sort()

  const today = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
  )
  const todayStr = today.toISOString().split('T')[0]

  const toggle = (date: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
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

      {shifts.length === 0 ? (
        <EmptyState title={t.pages.schedule.empty} description={t.pages.schedule.emptyDesc} />
      ) : (
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
      )}
    </div>
  )
}
