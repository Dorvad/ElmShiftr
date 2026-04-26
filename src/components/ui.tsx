import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Lottie from 'lottie-react'
import { t } from '../lib/i18n'
import type { ShiftType, RequestStatus, ApprovedShiftStatus, CancelStatus } from '../lib/supabase'
import avivImg  from '../assets/Aviv.png'
import dorImg   from '../assets/Dor.png'
import stevenImg from '../assets/Steven.png'
import yahavImg from '../assets/Yahav.png'
import loadingAnimation from '../assets/loadinganimation.json'

// ── Employee portraits ────────────────────────────────────────────────────────

export const EMPLOYEE_IMAGES: Record<string, string> = {
  'אביב':  avivImg,
  'דור':   dorImg,
  'סטיבן': stevenImg,
  'יהב':   yahavImg,
}

/**
 * Rounded-square avatar for an employee.
 * size="sm"  → 40 px, no name label (used inside tables / lists)
 * size="md"  → 56/64 px, name label below (used on the home panel)
 * Pass onClick to enable the hover-scale affordance and open a lightbox.
 */
export function EmployeeAvatar({
  name,
  shiftType,
  size = 'md',
  onClick,
}: {
  name: string
  shiftType: ShiftType
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const img = EMPLOYEE_IMAGES[name]
  const isEvening = shiftType === 'evening'
  const bg     = isEvening ? 'bg-indigo-50'   : 'bg-amber-50'
  const border = isEvening ? 'border-indigo-200' : 'border-amber-200'
  const fallback = isEvening ? 'text-indigo-400' : 'text-amber-500'
  const sizeClass = size === 'sm'
    ? 'w-10 h-10'
    : 'w-14 h-14 sm:w-16 sm:h-16'
  const interactiveClass = onClick
    ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-1'
    : 'cursor-default'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={`${sizeClass} rounded-xl border overflow-hidden flex items-center justify-center shadow-sm ${bg} ${border} ${interactiveClass}`}
      >
        {img
          ? <img src={img} alt={name} className="w-full h-full object-contain" />
          : <span className={`font-bold ${fallback} ${size === 'sm' ? 'text-sm' : 'text-xl'}`}>{name[0]}</span>
        }
      </button>
      {size === 'md' && (
        <span className="text-xs font-mono text-ink-500">{name}</span>
      )}
    </div>
  )
}

/**
 * Full-screen portrait lightbox.
 * Opens with a spring scale-up; closes with a fade + scale-down.
 * Closes on backdrop click, X button, or Escape key.
 */
export function EmployeeLightbox({ name, onClose }: { name: string; onClose: () => void }) {
  const [closing, setClosing] = useState(false)
  const img = EMPLOYEE_IMAGES[name]

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 210)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      style={{ backgroundColor: 'rgba(22,16,9,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-xs w-full overflow-hidden ${
          closing ? 'animate-lightbox-out' : 'animate-lightbox-in'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="סגור"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-ink-900/50 text-white hover:bg-ink-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Portrait illustration */}
        <div className="bg-parchment flex items-center justify-center px-8 pt-10 pb-6">
          {img
            ? <img src={img} alt={name} className="max-h-[55vh] w-auto object-contain drop-shadow-lg" />
            : <div className="w-32 h-32 rounded-full bg-ink-100 flex items-center justify-center text-4xl font-bold text-ink-400">{name[0]}</div>
          }
        </div>

        {/* Name footer */}
        <div className="px-6 py-4 border-t border-ink-100 text-center">
          <p className="font-display text-xl font-semibold text-ink-900">{name}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Existing shared components ────────────────────────────────────────────────

export function ShiftBadge({ type }: { type: ShiftType }) {
  return (
    <span className={type === 'morning' ? 'badge-morning' : 'badge-evening'}>
      {t.shiftType[type]}
    </span>
  )
}

export function StatusBadge({ status }: { status: RequestStatus | ApprovedShiftStatus | CancelStatus }) {
  const cls: Record<string, string> = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    canceled: 'badge-canceled',
  }
  const label: Record<string, string> = {
    pending:  t.status.pending,
    approved: t.status.approved,
    rejected: t.status.rejected,
    canceled: t.status.canceled,
  }
  return <span className={cls[status] || 'badge-pending'}>{label[status]}</span>
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <svg className={`${s[size]} animate-spin text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

export function LoadingState({ message = 'טוען...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-ink-400">
      <LoadingAnimation size="lg" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function LoadingAnimation({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }
  return (
    <div className={`${cls[size]} text-ink-500`} aria-label="loading animation">
      <Lottie animationData={loadingAnimation} loop autoplay />
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center text-ink-300 text-2xl font-mono">—</div>
      <p className="font-display text-lg text-ink-500">{title}</p>
      {description && <p className="text-sm text-ink-400 max-w-xs">{description}</p>}
    </div>
  )
}

export function Alert({ type, message, description }: { type: 'success' | 'error' | 'warning'; message: string; description?: string }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50    border-red-200    text-red-800',
    warning: 'bg-amber-50  border-amber-200  text-amber-800',
  }
  const icons = { success: '✓', error: '✕', warning: '!' }
  return (
    <div className={`border rounded-xl px-4 py-3 animate-slide-in ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <span className="font-mono font-bold text-sm mt-0.5">{icons[type]}</span>
        <div>
          <p className="font-medium text-sm">{message}</p>
          {description && <p className="text-sm opacity-80 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
  )
}
