import { useEffect, useState } from 'react'
import { supabase, type ApprovedShift } from '../lib/supabase'
import { t } from '../lib/i18n'
import { todayString, formatDateHebrew } from '../lib/dateHelpers'
import { Alert, ShiftBadge, Spinner, LoadingAnimation } from '../components/ui'
import { useEmployees } from '../hooks/useEmployees'

export default function CancelPage() {
  const { employees, loading: employeesLoading } = useEmployees()

  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [shifts, setShifts] = useState<ApprovedShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ApprovedShift | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEmployee) { setShifts([]); setSelectedShift(null); return }
    setLoadingShifts(true)
    setSelectedShift(null)
    setError(null)
    supabase
      .from('approved_shifts')
      .select('*')
      .eq('name', selectedEmployee)
      .eq('status', 'approved')
      .gte('date', todayString())
      .order('date', { ascending: true })
      .then(({ data }) => {
        setShifts((data ?? []) as ApprovedShift[])
        setLoadingShifts(false)
      })
  }, [selectedEmployee])

  const handleSubmit = async () => {
    if (!selectedShift) return
    setError(null)
    setSubmitting(true)
    try {
      const { error: err } = await supabase.from('cancel_requests').insert({
        name: selectedEmployee,
        date: selectedShift.date,
        shift_type: selectedShift.shift_type,
        reason: reason.trim() || null,
        status: 'pending',
        approved_shift_id: selectedShift.id,
      })
      if (err) throw err
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.errors.generic)
    } finally {
      setSubmitting(false)
    }
  }

  const resetAll = () => {
    setSuccess(false)
    setSelectedEmployee('')
    setShifts([])
    setSelectedShift(null)
    setReason('')
    setError(null)
  }

  if (success) {
    return (
      <div className="animate-slide-in max-w-md mx-auto pt-8">
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-amber-600 font-mono font-bold">!</span>
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">{t.pages.cancel.success}</h2>
          <p className="text-ink-500 mb-6">{t.pages.cancel.successDesc}</p>
          <button onClick={resetAll} className="btn-secondary w-full">שלח בקשה נוספת</button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="page-header mb-2">{t.pages.cancel.title}</h1>
        <p className="text-ink-500">{t.pages.cancel.subtitle}</p>
      </div>

      {error && <div className="mb-4"><Alert type="error" message={error} /></div>}

      {/* Step 1 — pick employee */}
      <div className="card p-6 mb-4">
        <label className="label">בחר את שמך</label>
        <select
          className="input"
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          disabled={employeesLoading}
        >
          <option value="">{employeesLoading ? 'טוען...' : 'בחר עובד'}</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.name}>{emp.name}</option>
          ))}
        </select>
      </div>

      {/* Step 2 — show their upcoming approved shifts */}
      {selectedEmployee && (
        <div className="card overflow-hidden animate-slide-in">
          <div className="px-5 py-4 border-b border-ink-100">
            <p className="font-semibold text-ink-800">המשמרות של {selectedEmployee}</p>
            <p className="text-xs text-ink-500 mt-0.5">בחר משמרת כדי לשלוח בקשת ביטול</p>
          </div>

          {loadingShifts ? (
            <div className="flex justify-center py-6"><LoadingAnimation /></div>
          ) : shifts.length === 0 ? (
            <div className="py-10 text-center px-6">
              <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center text-ink-300 text-xl font-mono mx-auto mb-3">—</div>
              <p className="text-sm font-medium text-ink-500">אין משמרות מאושרות קרובות</p>
              <p className="text-xs text-ink-400 mt-1">ל{selectedEmployee} אין משמרות עתידיות שניתן לבטל</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-50">
              {shifts.map(shift => {
                const isSelected = selectedShift?.id === shift.id
                return (
                  <div key={shift.id}>
                    {/* Shift row — selectable */}
                    <button
                      type="button"
                      onClick={() => setSelectedShift(isSelected ? null : shift)}
                      className={`w-full px-5 py-4 flex items-center gap-4 text-right transition-colors duration-150 ${
                        isSelected ? 'bg-red-50' : 'hover:bg-ink-50/60'
                      }`}
                    >
                      <div className="flex-1 text-right">
                        <p className="text-sm font-semibold text-ink-800">{formatDateHebrew(shift.date)}</p>
                        {shift.notes && (
                          <p className="text-xs text-ink-400 mt-0.5 truncate">{shift.notes}</p>
                        )}
                      </div>
                      <ShiftBadge type={shift.shift_type} />
                      <div className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                        isSelected ? 'border-red-400 bg-red-400' : 'border-ink-200'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Inline cancel form — expands when selected */}
                    {isSelected && (
                      <div className="px-5 pb-5 pt-3 bg-red-50 border-t border-red-100 animate-slide-in">
                        <div className="mb-4">
                          <label className="label text-red-700">{t.form.reason}</label>
                          <textarea
                            className="input resize-none"
                            rows={3}
                            placeholder={t.form.reasonPlaceholder}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {submitting ? <><Spinner size="sm" />{t.form.submitting}</> : 'שלח בקשת ביטול'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!selectedEmployee && (
        <p className="text-xs text-ink-400 text-center mt-4">בחר את שמך כדי לראות את המשמרות שלך</p>
      )}
    </div>
  )
}
