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

function MessageCard({ message }: { message: Message }) {
  const img = EMPLOYEE_IMAGES[message.author]
  const isImportant = message.message_type === 'important'

  return (
    <div className={`flex gap-4 px-5 py-4 transition-colors ${
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
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-ink-800">{message.author}</span>
          {isImportant && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-mono font-medium text-amber-700">
              ! חשוב
            </span>
          )}
          <span className="text-xs font-mono text-ink-400 mr-auto">{timeAgo(message.created_at)}</span>
        </div>
        {/* Content */}
        <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessageBoard() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [composing, setComposing] = useState(false)

  // Compose state
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [content,        setContent]        = useState('')
  const [messageType,    setMessageType]    = useState<MessageType>('info')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)

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
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => setMessages(prev => [payload.new as Message, ...prev]),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchMessages])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedAuthor || !content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('messages').insert({
        author: selectedAuthor,
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

  const cancelCompose = () => {
    setComposing(false)
    setContent('')
    setMessageType('info')
    setError(null)
  }

  const openCompose = () => setComposing(true)

  const canSubmit = !!selectedAuthor && content.trim().length > 0 && content.length <= 500

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="card overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center flex-none">
            <svg className="w-4 h-4 text-bone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink-900">לוח הודעות</p>
            <p className="text-xs text-ink-500 mt-0.5">עדכונים לצוות</p>
          </div>
        </div>

        {/* Toggle compose button */}
        <button
          type="button"
          onClick={composing ? cancelCompose : openCompose}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
            composing
              ? 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              : 'bg-ink-900 text-bone hover:bg-ink-800'
          }`}
        >
          <span className={`text-base font-mono leading-none inline-block transition-transform duration-300 ${composing ? 'rotate-45' : ''}`}>
            +
          </span>
          <span>{composing ? 'ביטול' : 'הודעה חדשה'}</span>
        </button>
      </div>

      {/* ── Compose area ────────────────────────────────────────────────── */}
      {composing && (
        <div className="border-b border-ink-100 bg-parchment/30 px-5 py-5 animate-slide-in">
          {error && (
            <p className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
              {error}
            </p>
          )}

          {/* Author picker */}
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
            {/* Important toggle */}
            <button
              type="button"
              onClick={() => setMessageType(p => p === 'info' ? 'important' : 'info')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                messageType === 'important'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              <span className="font-mono font-bold text-sm leading-none">!</span>
              <span>סמן כחשוב</span>
            </button>
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
            className="btn-primary w-full disabled:opacity-40"
          >
            {submitting
              ? <><Spinner size="sm" />שולח...</>
              : selectedAuthor ? `שלח בשם ${selectedAuthor}` : 'שלח הודעה'
            }
          </button>

          {!selectedAuthor && content.trim().length > 0 && (
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
          {messages.map(msg => <MessageCard key={msg.id} message={msg} />)}
        </div>
      )}
    </div>
  )
}
