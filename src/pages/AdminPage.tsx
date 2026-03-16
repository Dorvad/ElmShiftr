import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type ShiftRequest, type ApprovedShift, type CancelRequest, type ShiftType } from '../lib/supabase'
import { t } from '../lib/i18n'
import { formatDateHebrew, formatDateTime } from '../lib/dateHelpers'
import { ShiftBadge, StatusBadge, LoadingState, EmptyState, Alert, Spinner } from '../components/ui'

type Tab = 'pending' | 'approved' | 'cancellations'

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')
  const [pendingRequests, setPendingRequests] = useState<ShiftRequest[]>([])
  const [approvedShifts, setApprovedShifts] = useState<ApprovedShift[]>([])
  const [cancelRequests, setCancelRequests] = useState<CancelRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editShiftType, setEditShiftType] = useState<ShiftType>('evening')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/admin/login')
    })
  }, [navigate])

  const fetchAll = useCallback(async () => {
    const [p, a, c] = await Promise.all([
      supabase.from('shift_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('approved_shifts').select('*').order('date').order('shift_type'),
      supabase.from('cancel_requests').select('*').eq('status', 'pending').order('created_at'),
    ])
    if (p.data) setPendingRequests(p.data as ShiftRequest[])
    if (a.data) setApprovedShifts(a.data as ApprovedShift[])
    if (c.data) setCancelRequests(c.data as CancelRequest[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase.channel('admin_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approved_shifts' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancel_requests' }, fetchAll)
      .subscribe()
    const interval = setInterval(fetchAll, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [fetchAll])

  const act = async (id: string, fn: () => Promise<void>) => {
    setActionError(null)
    setActionLoading(id)
    try { await fn() } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : t.errors.generic)
    } finally { setActionLoading(null); await fetchAll() }
  }

  const approveRequest = (req: ShiftRequest) => act(req.id, async () => {
    await supabase.from('shift_requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('approved_shifts').insert({
      name: req.name, date: req.date, shift_type: req.shift_type,
      notes: req.notes, status: 'approved', shift_request_id: req.id,
    })
  })

  const rejectRequest = (id: string) => act(id, async () => {
    await supabase.from('shift_requests').update({ status: 'rejected' }).eq('id', id)
  })

  const approveWithEdit = (req: ShiftRequest) => act(req.id, async () => {
    await supabase.from('shift_requests').update({
      name: editName, date: editDate, shift_type: editShiftType,
      notes: editNotes || null, status: 'approved',
    }).eq('id', req.id)
    await supabase.from('approved_shifts').insert({
      name: editName, date: editDate, shift_type: editShiftType,
      notes: editNotes || null, status: 'approved', shift_request_id: req.id,
    })
    setEditingId(null)
  })

  const cancelShift = (shift: ApprovedShift) => act(shift.id, async () => {
    await supabase.from('approved_shifts').update({ status: 'canceled' }).eq('id', shift.id)
  })

  const restoreShift = (shift: ApprovedShift) => act(shift.id, async () => {
    await supabase.from('approved_shifts').update({ status: 'approved' }).eq('id', shift.id)
  })

  const approveCancelReq = (req: CancelRequest) => act(req.id, async () => {
    await supabase.from('cancel_requests').update({ status: 'approved' }).eq('id', req.id)
    if (req.approved_shift_id) {
      await supabase.from('approved_shifts').update({ status: 'canceled' }).eq('id', req.approved_shift_id)
    }
  })

  const rejectCancelReq = (id: string) => act(id, async () => {
    await supabase.from('cancel_requests').update({ status: 'rejected' }).eq('id', id)
  })

  const resetBoard = () => act('reset-board', async () => {
    if (!window.confirm(t.pages.admin.resetBoardConfirm)) return

    await Promise.all([
      supabase.from('approved_shifts').delete().neq('id', ''),
      supabase.from('shift_requests').delete().neq('id', ''),
      supabase.from('cancel_requests').delete().neq('id', ''),
    ])
  })

  const startEdit = (req: ShiftRequest) => {
    setEditingId(req.id)
    setEditName(req.name)
    setEditDate(req.date)
    setEditShiftType(req.shift_type)
    setEditNotes(req.notes || '')
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: t.pages.admin.tabs.pending, count: pendingRequests.length },
    { key: 'approved', label: t.pages.admin.tabs.approved },
    { key: 'cancellations', label: t.pages.admin.tabs.cancellations, count: cancelRequests.length },
  ]

  if (loading) return <LoadingState message="טוען דשבורד..." />

  return (
    <div className="animate-fade-in">
      <h1 className="page-header mb-6">{t.pages.admin.title}</h1>

      {actionError && <div className="mb-4"><Alert type="error" message={actionError} /></div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-parchment border border-ink-200 rounded-2xl p-1 mb-6">
        {tabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              tab === key ? 'bg-white shadow-sm text-ink-900 border border-ink-100' : 'text-ink-500 hover:text-ink-700'
            }`}>
            {label}
            {count !== undefined && count > 0 && (
              <span className={`w-5 h-5 rounded-full text-xs font-mono flex items-center justify-center ${
                tab === key ? 'bg-ember-500 text-white' : 'bg-ink-200 text-ink-600'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Pending */}
      {tab === 'pending' && (
        <div className="flex flex-col gap-4">
          {pendingRequests.length === 0 ? <EmptyState title={t.pages.admin.pendingEmpty} /> :
            pendingRequests.map(req => (
              <div key={req.id} className="card p-5 animate-slide-in">
                {editingId === req.id ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-mono text-ink-400 uppercase tracking-wider">עורך בקשה</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">{t.form.name}</label>
                        <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">{t.form.date}</label>
                        <input className="input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['morning', 'evening'] as ShiftType[]).map(type => (
                        <button key={type} type="button" onClick={() => setEditShiftType(type)}
                          className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            editShiftType === type
                              ? type === 'morning' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-indigo-400 bg-indigo-50 text-indigo-800'
                              : 'border-ink-200 text-ink-600 bg-white'
                          }`}>
                          {type === 'morning' ? 'בוקר' : 'ערב'}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="label">{t.form.notes}</label>
                      <textarea className="input resize-none" rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveWithEdit(req)} disabled={actionLoading === req.id} className="btn-success flex-1">
                        {actionLoading === req.id ? <Spinner size="sm" /> : t.pages.admin.approve}
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary">
                        {t.pages.admin.discard}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-display text-lg font-semibold text-ink-900">{req.name}</span>
                        <ShiftBadge type={req.shift_type} />
                      </div>
                      <span className="text-sm text-ink-600">{formatDateHebrew(req.date)}</span>
                      {req.notes && <span className="text-sm text-ink-500 italic">"{req.notes}"</span>}
                      <span className="text-xs font-mono text-ink-400">התקבל: {formatDateTime(req.created_at)}</span>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <button onClick={() => startEdit(req)} className="btn-secondary text-sm px-4 py-2">{t.pages.admin.edit}</button>
                      <button onClick={() => approveRequest(req)} disabled={actionLoading === req.id} className="btn-success">
                        {actionLoading === req.id ? <Spinner size="sm" /> : t.pages.admin.approve}
                      </button>
                      <button onClick={() => rejectRequest(req.id)} disabled={actionLoading === req.id} className="btn-danger">
                        {actionLoading === req.id ? <Spinner size="sm" /> : t.pages.admin.reject}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* Approved */}
      {tab === 'approved' && (
        <div className="flex flex-col gap-3">
          <div className="card p-4 border border-ember-200 bg-ember-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-ink-600">{t.pages.admin.resetBoardHint}</p>
            <button onClick={resetBoard} disabled={actionLoading === 'reset-board'} className="btn-danger w-full sm:w-auto">
              {actionLoading === 'reset-board' ? <Spinner size="sm" /> : t.pages.admin.resetBoard}
            </button>
          </div>

          {approvedShifts.length === 0 ? <EmptyState title={t.pages.admin.approvedEmpty} /> :
            approvedShifts.map(shift => (
              <div key={shift.id} className={`card p-4 flex items-center justify-between gap-4 ${shift.status === 'canceled' ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-ink-900">{shift.name}</span>
                    <ShiftBadge type={shift.shift_type as ShiftType} />
                    <StatusBadge status={shift.status} />
                  </div>
                  <span className="text-sm text-ink-500">{formatDateHebrew(shift.date)}</span>
                  {shift.notes && <span className="text-xs text-ink-400 italic">"{shift.notes}"</span>}
                </div>
                <div className="shrink-0">
                  {shift.status === 'approved' ? (
                    <button onClick={() => cancelShift(shift)} disabled={actionLoading === shift.id} className="btn-danger">
                      {actionLoading === shift.id ? <Spinner size="sm" /> : t.pages.admin.cancel}
                    </button>
                  ) : (
                    <button onClick={() => restoreShift(shift)} disabled={actionLoading === shift.id} className="btn-secondary text-sm px-3 py-2">
                      {actionLoading === shift.id ? <Spinner size="sm" /> : t.pages.admin.restore}
                    </button>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Cancellations */}
      {tab === 'cancellations' && (
        <div className="flex flex-col gap-4">
          {cancelRequests.length === 0 ? <EmptyState title={t.pages.admin.cancellationsEmpty} /> :
            cancelRequests.map(req => (
              <div key={req.id} className="card p-5 animate-slide-in">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-display text-lg font-semibold text-ink-900">{req.name}</span>
                      <ShiftBadge type={req.shift_type as ShiftType} />
                    </div>
                    <span className="text-sm text-ink-600">{formatDateHebrew(req.date)}</span>
                    {req.reason && <span className="text-sm text-ink-500 italic">סיבה: "{req.reason}"</span>}
                    <span className="text-xs font-mono text-ink-400">התקבל: {formatDateTime(req.created_at)}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => approveCancelReq(req)} disabled={actionLoading === req.id} className="btn-success">
                      {actionLoading === req.id ? <Spinner size="sm" /> : t.pages.admin.approveCancel}
                    </button>
                    <button onClick={() => rejectCancelReq(req.id)} disabled={actionLoading === req.id} className="btn-danger">
                      {actionLoading === req.id ? <Spinner size="sm" /> : t.pages.admin.rejectCancel}
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
