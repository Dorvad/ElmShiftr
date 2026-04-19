import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Message, MessageType } from '../lib/supabase'
import { EMPLOYEE_IMAGES, Spinner } from './ui'

const EMPLOYEES = ['יהב', 'אביב', 'סטיבן', 'דור'] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (m < 1)  return 'עכשיו'
  if (m < 60) return `לפני ${m} דק׳`
  const h = Math.floor(m / 60)
  if (h < 24) return `לפני ${h} שע׳`
  const d = Math.floor(h / 24)
  return d === 1 ? 'אתמול' : `לפני ${d} ימים`
}

// ── Author chip (compose author picker) ───────────────────────────────────────

function AuthorChip({ name, selected, onSelect }: {
  name: string
  selected: boolean
  onSelect: () => void
}) {
  const img = EMPLOYEE_IMAGES[name]
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${
        selected ? 'scale-110' : 'opacity-50 hover:opacity-85 hover:scale-105'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex items-center justify-center bg-ink-50 transition-all duration-200 ${
        selected
          ? 'border-ink-800 shadow-md ring-2 ring-ink-200 ring-offset-1'
          : 'border-ink-200'
      }`}>
        {img
          ? <img src={img} alt={name} className="w-full h-full object-contain" />
          : <span className="text-lg font-bold text-ink-400">{name[0]}</span>
        }
      </div>
      <span className={`text-xs font-mono transition-colors ${selected ? 'text-ink-800 font-semibold' : 'text-ink-400'}`}>
        {name}
      </span>
    </button>
  )
}

// ── Single message card ───────────────────────────────────────────────────────

function MessageCard({ message, isAdmin, onDelete }: {
  message: Message
  isAdmin: boolean
  onDelete: (id: string) => void
}) {
  const img = EMPLOYEE_IMAGES[message.author]
  const isImportant = message.message_type === 'important'
  const isAdminMsg  = message.message_type === 'admin'

  if (isAdminMsg) {
    return (
      <div className="relative flex gap-4 px-5 py-5 bg-ink-900 group">
        {/* Admin avatar badge */}
        <div className="flex-none w-10 h-10 rounded-xl bg-ember-500 flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-base leading-none">E</span>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold text-bone">{message.author}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ember-500/20 border border-ember-500/40 text-[10px] font-mono font-medium text-ember-400">
              ★ הודעת מנהל
            </span>
            <span className="text-xs font-mono text-ink-500 mr-auto">{timeAgo(message.created_at)}</span>
          </div>
          <p className="text-sm text-bone/90 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Delete button (admin only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            aria-label="מחק הודעה"
            className="absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative flex gap-4 px-5 py-4 transition-colors group ${
      isImportant ? 'bg-amber-50/50' : 'hover:bg-ink-50/40'
    }`}>
      {/* Avatar */}
      <div className={`flex-none w-10 h-10 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 ${
        isImportant ? 'border-amber-200 bg-amber-50' : 'border-ink-100 bg-ink-50'
      }`}>
        {img
          ? <img src={img} alt={message.author} className="w-full h-full object-contain" />
          : <span className="text-sm font-bold text-ink-400">{message.author[0]}</span>
        }
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-ink-800">{message.author}</span>
          {isImportant && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-mono font-medium text-amber-700">
              ! חשוב
            </span>
          )}
          <span className="text-xs font-mono text-ink-400 mr-auto">{timeAgo(message.created_at)}</span>
        </div>
        <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>

      {/* Delete button (admin only) */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          aria-label="מחק הודעה"
          className="absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Wipe confirmation button ──────────────────────────────────────────────────

function WipeButton({ onConfirm }: { onConfirm: () => void }) {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')

  if (step === 'confirm') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600 font-mono">בטוח?</span>
        <button
          type="button"
          onClick={() => { onConfirm(); setStep('idle') }}
          className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
        >
          מחק הכל
        </button>
        <button
          type="button"
          onClick={() => setStep('idle')}
          className="px-2.5 py-1 rounded-lg bg-ink-100 text-ink-600 text-xs font-medium hover:bg-ink-200 transition-colors"
        >
          ביטול
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setStep('confirm')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span>נקה לוח</span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessageBoard() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [composing, setComposing] = useState(false)
  const [isAdmin,   setIsAdmin]   = useState(false)

  // Compose state
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [content,        setContent]        = useState('')
  const [messageType,    setMessageType]    = useState<MessageType>('info')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // ── Auth detection ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsAdmin(!!data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAdmin(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, author, content, message_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error && data) setMessages(data as Message[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMessages()
    const channel = supabase
      .channel('messages_board')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchMessages(),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchMessages])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const author = isAdmin ? 'מנהל' : selectedAuthor
    if (!author || !content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('messages').insert({
        author,
        content: content.trim(),
        message_type: messageType,
      })
      if (err) throw err
      setContent('')
      setMessageType('info')
      setComposing(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'אירעה שגיאה. נסה שוב.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const handleWipe = async () => {
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setMessages([])
  }

  const cancelCompose = () => {
    setComposing(false)
    setContent('')
    setMessageType('info')
    setError(null)
  }

  const openCompose = () => setComposing(true)

  const canSubmit = (isAdmin || !!selectedAuthor) && content.trim().length > 0 && content.length <= 500

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="card overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center flex-none">
            <svg className="w-4 h-4 text-bone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-ink-900">לוח הודעות</p>
              {isAdmin && (
                <span className="px-1.5 py-0.5 rounded-md bg-ember-500/10 border border-ember-500/30 text-[10px] font-mono font-semibold text-ember-600 leading-none">
                  מנהל
                </span>
              )}
            </div>
            <p className="text-xs text-ink-500 mt-0.5">עדכונים לצוות</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wipe button (admin only) */}
          {isAdmin && messages.length > 0 && (
            <WipeButton onConfirm={handleWipe} />
          )}

          {/* Toggle compose button */}
          <button
            type="button"
            onClick={composing ? cancelCompose : openCompose}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
              composing
                ? 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                : isAdmin
                  ? 'bg-ember-500 text-white hover:bg-ember-600'
                  : 'bg-ink-900 text-bone hover:bg-ink-800'
            }`}
          >
            <span className={`text-base font-mono leading-none inline-block transition-transform duration-300 ${composing ? 'rotate-45' : ''}`}>
              +
            </span>
            <span>{composing ? 'ביטול' : 'הודעה חדשה'}</span>
          </button>
        </div>
      </div>

      {/* ── Compose area ────────────────────────────────────────────────── */}
      {composing && (
        <div className={`border-b border-ink-100 px-5 py-5 animate-slide-in ${
          isAdmin ? 'bg-ink-950/5' : 'bg-parchment/30'
        }`}>
          {error && (
            <p className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
              {error}
            </p>
          )}

          {/* Author section */}
          {isAdmin ? (
            /* Admin: locked author display */
            <div className="mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ember-500 flex items-center justify-center">
                <span className="text-white font-display font-bold text-base leading-none">E</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">מנהל</p>
                <p className="text-xs text-ink-400">שולח בשם המנהל</p>
              </div>
            </div>
          ) : (
            /* Employee: author picker */
            <div className="mb-5">
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-3">
                מי כותב?
              </p>
              <div className="flex justify-around sm:justify-start sm:gap-6">
                {EMPLOYEES.map(emp => (
                  <AuthorChip
                    key={emp}
                    name={emp}
                    selected={selectedAuthor === emp}
                    onSelect={() => setSelectedAuthor(emp)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            className="input resize-none text-sm mb-2"
            rows={3}
            placeholder="כתוב כאן..."
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 500))}
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-between mb-4">
            {/* Type selector */}
            <div className="flex items-center gap-2">
              {/* Important toggle (both admin and employee) */}
              <button
                type="button"
                onClick={() => setMessageType(p => p === 'important' ? 'info' : 'important')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  messageType === 'important'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-ink-200 text-ink-500 hover:border-ink-300'
                }`}
              >
                <span className="font-mono font-bold text-sm leading-none">!</span>
                <span>חשוב</span>
              </button>

              {/* Admin announcement toggle (admin only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setMessageType(p => p === 'admin' ? 'info' : 'admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    messageType === 'admin'
                      ? 'bg-ember-50 border-ember-400 text-ember-700'
                      : 'bg-white border-ink-200 text-ink-500 hover:border-ink-300'
                  }`}
                >
                  <span className="font-mono font-bold text-sm leading-none">★</span>
                  <span>הכרזת מנהל</span>
                </button>
              )}
            </div>

            {/* Char counter */}
            <span className={`text-xs font-mono ${content.length > 450 ? 'text-amber-500' : 'text-ink-400'}`}>
              {content.length}/500
            </span>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`w-full disabled:opacity-40 rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
              messageType === 'admin'
                ? 'bg-ember-500 hover:bg-ember-600 text-white'
                : 'btn-primary'
            }`}
          >
            {submitting
              ? <><Spinner size="sm" />שולח...</>
              : isAdmin
                ? messageType === 'admin' ? 'פרסם הכרזת מנהל' : 'שלח הודעה'
                : selectedAuthor ? `שלח בשם ${selectedAuthor}` : 'שלח הודעה'
            }
          </button>

          {!isAdmin && !selectedAuthor && content.trim().length > 0 && (
            <p className="text-center text-xs text-amber-600 font-mono mt-2">בחר מי כותב</p>
          )}
        </div>
      )}

      {/* ── Messages list ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : messages.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink-500">אין הודעות עדיין</p>
          {!composing && (
            <button
              type="button"
              onClick={openCompose}
              className="text-xs text-ink-400 underline underline-offset-2 hover:text-ink-600 transition-colors mt-1"
            >
              כתוב את ההודעה הראשונה
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {messages.map(msg => (
            <MessageCard
              key={msg.id}
              message={msg}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
