import { t } from '../lib/i18n'
import type { ShiftType, RequestStatus, ApprovedShiftStatus, CancelStatus } from '../lib/supabase'

export function ShiftBadge({ type }: { type: ShiftType }) {
  return (
    <span className={type === 'morning' ? 'badge-morning' : 'badge-evening'}>
      {t.shiftType[type]}
    </span>
  )
}

export function StatusBadge({ status }: { status: RequestStatus | ApprovedShiftStatus | CancelStatus }) {
  const cls: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    canceled: 'badge-canceled',
  }
  const label: Record<string, string> = {
    pending: t.status.pending,
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
      <Spinner size="lg" />
      <span className="text-sm">{message}</span>
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
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
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
