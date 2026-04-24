import { BookingEditor } from '../components/BookingEditor'

export default function BookingsPage() {
  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div className="card p-5 border border-ink-100 bg-gradient-to-br from-parchment to-white">
        <h1 className="page-header mb-1">משחקים שהוזמנו</h1>
        <p className="text-sm text-ink-500">עדכנו במהלך המשמרת אילו משחקים הוזמנו, כדי שהמידע יהיה זמין לכל הצוות בלוח המשמרות.</p>
      </div>
      <BookingEditor />
    </div>
  )
}
