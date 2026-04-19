import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type ShiftType } from '../lib/supabase'
import { todayString } from '../lib/dateHelpers'
import { ShiftBadge, Spinner } from '../components/ui'
import butcheryImg from '../assets/butchery_button.png'
import elmImg from '../assets/elm_button.png'
import wrongTurnImg from '../assets/wrongturn_button.png'

type ShiftSlot = { date: string; shift_type: ShiftType; workers: string[] }

function tomorrowString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function formatSlotDate(dateStr: string): { label: string; highlight: boolean } {
  if (dateStr === todayString()) return { label: 'היום', highlight: true }
  if (dateStr === tomorrowString()) return { label: 'מחר', highlight: false }
  const date = new Date(dateStr + 'T00:00:00')
  return {
    label: date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }),
    highlight: false,
  }
}

function useUpcomingShiftSlots() {
  const [slots, setSlots] = useState<ShiftSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('approved_shifts')
      .select('name, date, shift_type')
      .eq('status', 'approved')
      .gte('date', todayString())
      .order('date', { ascending: true })
      .limit(60)
      .then(({ data }) => {
        const map = new Map<string, string[]>()
        for (const s of data ?? []) {
          const key = `${s.date}|${s.shift_type}`
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(s.name)
        }
        const sorted: ShiftSlot[] = Array.from(map.entries())
          .map(([key, workers]) => {
            const [date, shift_type] = key.split('|') as [string, ShiftType]
            return { date, shift_type, workers }
          })
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.shift_type === 'morning' ? -1 : 1
          })
          .slice(0, 3)
        setSlots(sorted)
        setLoading(false)
      })
  }, [])

  return { slots, loading }
}

const manualVenueLinks = [
  {
    venueKey: 'butchery',
    venueName: 'הקצביה',
    sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-the-butchery',
    image: butcheryImg,
  },
  {
    venueKey: 'elm_street',
    venueName: 'אלם סטריט',
    sourceUrl: 'https://www.escaperoom.co.il/tel-Aviv-elm-street',
    image: elmImg,
  },
  {
    venueKey: 'wrong_turn',
    venueName: 'טעות בכיוון',
    sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-wrong-turn',
    image: wrongTurnImg,
  },
]

export default function HomePage() {
  const { slots, loading } = useUpcomingShiftSlots()

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-white border border-ink-100 rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-ink-500 tracking-wider">מערכת פעילה</span>
        </div>
        <h1 className="page-header mb-3">ניהול משמרות</h1>
        <p className="text-ink-500 text-lg max-w-sm mx-auto leading-relaxed">
          מערכת ניהול משמרות לצוות חדר הבריחה
        </p>
      </div>

      {/* Upcoming shifts — primary view */}
      <section className="max-w-3xl mx-auto mb-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-900">המשמרות הקרובות</p>
              <p className="text-xs text-ink-500 mt-0.5">שלוש המשמרות הבאות המאושרות</p>
            </div>
            <Link
              to="/schedule"
              className="flex items-center gap-1 text-xs font-mono text-ink-400 hover:text-ember-500 transition-colors group"
            >
              <span>לוח מלא</span>
              <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-400">אין משמרות קרובות מאושרות</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-50">
              {slots.map((slot) => {
                const { label, highlight } = formatSlotDate(slot.date)
                return (
                  <div
                    key={`${slot.date}|${slot.shift_type}`}
                    className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap"
                  >
                    <p className={`flex-none text-sm font-medium w-28 sm:w-36 leading-tight ${highlight ? 'text-emerald-600' : 'text-ink-700'}`}>
                      {label}
                    </p>
                    <div className="flex-none">
                      <ShiftBadge type={slot.shift_type} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {slot.workers.map(w => (
                        <span key={w} className="px-2.5 py-1 bg-ink-50 border border-ink-100 rounded-lg text-sm text-ink-700 font-medium">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Link
            to="/schedule"
            className="flex items-center justify-between px-5 py-4 border-t border-ink-100 bg-ink-50/60 hover:bg-ink-100/60 transition-colors group"
          >
            <span className="text-sm font-medium text-ink-700 group-hover:text-ink-900 transition-colors">
              צפה בלוח המשמרות המלא
            </span>
            <span className="text-xs font-mono text-ink-400 group-hover:text-ink-600 group-hover:-translate-x-1 transition-all inline-block">
              ←
            </span>
          </Link>
        </div>
      </section>

      {/* Action CTAs */}
      <div className="max-w-3xl mx-auto grid gap-3 sm:grid-cols-2 mb-8">
        {/* Request shift — secondary priority */}
        <Link
          to="/request"
          className="card p-6 flex flex-col gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-ember-500 flex items-center justify-center text-white text-xl font-mono group-hover:opacity-90 transition-opacity">
            +
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-1">בקשת משמרת</h2>
            <p className="text-sm text-ink-500 leading-relaxed">שלח בקשה להיכנס למשמרת עתידית</p>
          </div>
          <div className="mt-auto text-xs font-mono text-ink-400 group-hover:text-ink-600 transition-colors flex items-center gap-1">
            <span>שלח בקשה</span>
            <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
          </div>
        </Link>

        {/* Cancel shift — tertiary priority */}
        <Link
          to="/cancel"
          className="card p-6 flex flex-col gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-dashed"
        >
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center text-ink-500 text-xl font-mono group-hover:bg-ink-200 transition-colors">
            ×
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-600 mb-1">בקשת ביטול</h2>
            <p className="text-sm text-ink-400 leading-relaxed">בקש לבטל משמרת מאושרת</p>
          </div>
          <div className="mt-auto text-xs font-mono text-ink-300 group-hover:text-ink-500 transition-colors flex items-center gap-1">
            <span>בקש ביטול</span>
            <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
          </div>
        </Link>
      </div>

      {/* Venue game buttons */}
      <section className="max-w-3xl mx-auto">
        <div className="card p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-ink-800">בדיקת משחקים שהוזמנו</p>
            <p className="text-xs text-ink-500 mt-1">
              בדקו ישירות בכל אתר כדי לראות אילו שעות כבר נתפסו.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {manualVenueLinks.map((venue) => (
              <a
                key={venue.venueKey}
                href={venue.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="venue-btn"
              >
                <img src={venue.image} alt={venue.venueName} className="venue-btn__img" />
                <div className="venue-btn__overlay">
                  <p className="venue-btn__name">{venue.venueName}</p>
                  <p className="venue-btn__hint">
                    מעבר לעמוד ההזמנות
                    <span className="venue-btn__arrow">←</span>
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
