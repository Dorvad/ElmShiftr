import { useState } from 'react'
import { supabase, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { todayString } from '../lib/dateHelpers'
import { Alert, Spinner } from '../components/ui'

export default function CancelPage() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [shiftType, setShiftType] = useState<ShiftType>('evening')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !date) { setError(t.errors.required); return }
    setLoading(true)
    try {
      const { data, error: findErr } = await supabase
        .from('approved_shifts').select('id')
        .eq('name', name.trim()).eq('date', date)
        .eq('shift_type', shiftType).eq('status', 'approved').limit(1)
      if (findErr) throw findErr
      if (!data || data.length === 0) { setError(t.pages.cancel.notFound); setLoading(false); return }

      const { error: err } = await supabase.from('cancel_requests').insert({
        name: name.trim(), date, shift_type: shiftType,
        reason: reason.trim() || null, status: 'pending',
        approved_shift_id: data[0].id,
      })
      if (err) throw err
      setSuccess(true)
      setName(''); setDate(''); setShiftType('evening'); setReason('')
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
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-amber-600 font-mono font-bold">!</span>
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">{t.pages.cancel.success}</h2>
          <p className="text-ink-500 mb-6">{t.pages.cancel.successDesc}</p>
          <button onClick={() => setSuccess(false)} className="btn-secondary w-full">שלח בקשה נוספת</button>
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
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <Alert type="error" message={error} />}

          <div>
            <label className="label">{t.form.name} *</label>
            <input className="input" type="text" placeholder={t.form.namePlaceholder}
              value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div>
            <label className="label">{t.form.date} *</label>
            <input className="input" type="date" min={todayString()}
              value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div>
            <label className="label">{t.form.shiftType} *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['morning', 'evening'] as ShiftType[]).map(type => (
                <button key={type} type="button" onClick={() => setShiftType(type)}
                  className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ${
                    shiftType === type
                      ? type === 'morning' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
                  }`}>
                  <div className="font-semibold">{type === 'morning' ? 'בוקר' : 'ערב'}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{t.form.reason}</label>
            <textarea className="input resize-none" rows={3} placeholder={t.form.reasonPlaceholder}
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <><Spinner size="sm" />{t.form.submitting}</> : t.form.submit}
          </button>
        </form>
      </div>
      <p className="text-xs text-ink-400 text-center mt-4">יש לוודא שהפרטים זהים למשמרת המאושרת</p>
    </div>
  )
}
