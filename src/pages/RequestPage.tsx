import { useRef, useState } from 'react'
import { supabase, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { todayString } from '../lib/dateHelpers'
import { Alert, Spinner } from '../components/ui'
import { useEmployees } from '../hooks/useEmployees'

interface ShiftRow {
  id: number
  date: string
  shiftType: ShiftType
  notes: string
}

export default function RequestPage() {
  const rowCounterRef = useRef(0)

  const createRow = (): ShiftRow => ({
    id: ++rowCounterRef.current,
    date: '',
    shiftType: 'evening',
    notes: '',
  })

  const { employees, loading: employeesLoading } = useEmployees()
  const [name, setName] = useState('')
  const [rows, setRows] = useState<ShiftRow[]>(() => [createRow()])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<number[]>([])

  const updateRow = (id: number, field: keyof ShiftRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => setRows(prev => [...prev, createRow()])

  const removeRow = (id: number) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWarnings([])

    if (!name.trim()) { setError(t.errors.required); return }

    const filledRows = rows.filter(r => r.date)
    if (filledRows.length === 0) { setError('יש לבחור תאריך לפחות לאחת המשמרות'); return }

    setLoading(true)
    try {
      const warnIds: number[] = []

      for (const row of filledRows) {
        const { data: dup } = await supabase
          .from('shift_requests').select('id')
          .eq('name', name.trim()).eq('date', row.date)
          .eq('shift_type', row.shiftType)
          .in('status', ['pending', 'approved']).limit(1)
        if (dup && dup.length > 0) { warnIds.push(row.id); continue }

        await supabase.from('shift_requests').insert({
          name: name.trim(),
          date: row.date,
          shift_type: row.shiftType,
          notes: row.notes.trim() || null,
          status: 'pending',
        })
      }

      setWarnings(warnIds)
      const submitted = filledRows.length - warnIds.length
      if (submitted > 0) {
        setSuccessCount(submitted)
        setSuccess(true)
        setName('')
        setRows([createRow()])
      } else {
        setError(t.pages.request.duplicateWarning)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.errors.generic)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="animate-slide-in max-w-md mx-auto pt-8">
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-emerald-600 font-mono font-bold">✓</span>
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">{t.pages.request.success}</h2>
          <p className="text-ink-500 mb-1">{t.pages.request.successDesc}</p>
          <p className="text-sm font-mono text-ink-400 mb-6">
            {successCount} {successCount === 1 ? 'משמרת נשלחה' : 'משמרות נשלחו'}
          </p>
          <button onClick={() => setSuccess(false)} className="btn-secondary w-full">
            הגש בקשה נוספת
          </button>
        </div>
      </div>
    )
  }

  const filledCount = rows.filter(r => r.date).length

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-header mb-2">{t.pages.request.title}</h1>
        <p className="text-ink-500">{t.pages.request.subtitle}</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <Alert type="error" message={error} />}

          {/* Name */}
          <div>
            <label className="label">{t.form.name} *</label>
            <select
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={employeesLoading}
            >
              <option value="">{employeesLoading ? 'טוען...' : 'בחר עובד'}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Shift rows */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">משמרות</label>
              <span className="text-xs font-mono text-ink-400">{rows.length} שורות</span>
            </div>

            {rows.map((row, idx) => (
              <div key={row.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-150 ${
                  warnings.includes(row.id)
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-ink-100 bg-ink-50/40'
                }`}>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-ink-400">משמרת {idx + 1}</span>
                  <div className="flex items-center gap-3">
                    {warnings.includes(row.id) && (
                      <span className="text-xs text-amber-700 font-medium">כבר קיימת בקשה</span>
                    )}
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(row.id)}
                        className="text-ink-300 hover:text-red-500 transition-colors text-sm font-mono">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">{t.form.date}</label>
                    <input className="input text-sm py-2.5" type="date" min={todayString()}
                      value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">{t.form.shiftType}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['morning', 'evening'] as ShiftType[]).map(type => (
                        <button key={type} type="button"
                          onClick={() => updateRow(row.id, 'shiftType', type)}
                          className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all duration-150 ${
                            row.shiftType === type
                              ? type === 'morning'
                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                : 'border-indigo-400 bg-indigo-50 text-indigo-800'
                              : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
                          }`}>
                          <div className="font-semibold">{type === 'morning' ? 'בוקר' : 'ערב'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label text-xs">{t.form.notes}</label>
                  <input className="input text-sm py-2.5" type="text"
                    placeholder={t.form.notesPlaceholder}
                    value={row.notes} onChange={e => updateRow(row.id, 'notes', e.target.value)} />
                </div>
              </div>
            ))}

            <button type="button" onClick={addRow}
              className="w-full py-3 rounded-xl border-2 border-dashed border-ink-200 text-ink-500 hover:border-ink-400 hover:text-ink-700 hover:bg-ink-50/50 transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2">
              <span className="text-lg leading-none font-mono">+</span>
              הוסף משמרת
            </button>
          </div>

          <button type="submit" className="btn-ember w-full" disabled={loading}>
            {loading
              ? <><Spinner size="sm" />{t.form.submitting}</>
              : filledCount > 1
                ? `שלח ${filledCount} משמרות`
                : 'שלח בקשה'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
