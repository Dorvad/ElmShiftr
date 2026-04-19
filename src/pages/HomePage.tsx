import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type ShiftType } from '../lib/supabase'
import { todayString } from '../lib/dateHelpers'
import { ShiftBadge, Spinner } from '../components/ui'
import butcheryImg from '../assets/butchery_button.png'
import elmImg from '../assets/elm_button.png'
import wrongTurnImg from '../assets/wrongturn_button.png'
import avivImg from '../assets/Aviv.png'
import dorImg from '../assets/Dor.png'
import stevenImg from '../assets/Steven.png'
import yahavImg from '../assets/Yahav.png'

// Hebrew name → portrait asset
const EMPLOYEE_IMAGES: Record<string, string> = {
  'אביב': avivImg,
  'דור': dorImg,
  'סטיבן': stevenImg,
  'יהב': yahavImg,
}

type ShiftSlot = { date: string; shift_type: ShiftType; workers: string[] }

function tomorrowString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function formatSlotDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const shortDate = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
  const weekday  = date.toLocaleDateString('he-IL', { weekday: 'long' })

  if (dateStr === todayString())   return { primary: 'היום',  secondary: `${weekday}, ${shortDate}`, highlight: true }
  if (dateStr === tomorrowString()) return { primary: 'מחר',   secondary: `${weekday}, ${shortDate}`, highlight: false }
  return { primary: weekday, secondary: shortDate, highlight: false }
}

function EmployeeAvatar({ name, shiftType }: { name: string; shiftType: ShiftType }) {
  const img = EMPLOYEE_IMAGES[name]
  const isEvening = shiftType === 'evening'
  // Tint the avatar background to match the shift type — amber for morning, indigo for evening
  const bg     = isEvening ? 'bg-indigo-50'  : 'bg-amber-50'
  const border = isEvening ? 'border-indigo-200' : 'border-amber-200'
  const fallback = isEvening ? 'text-indigo-400' : 'text-amber-500'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border overflow-hidden flex items-center justify-center shadow-sm ${bg} ${border}`}>
        {img
          ? <img src={img} alt={name} className="w-full h-full object-contain" />
          : <span className={`text-xl font-bold ${fallback}`}>{name[0]}</span>
        }
      </div>
      <span className="text-xs font-mono text-ink-500">{name}</span>
    </div>
  )
}

function useUpcomingShiftSlots() {
  const [slots, setSlots]   = useState<ShiftSlot[]>([])
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
  { venueKey: 'butchery',   venueName: 'הקצביה',     sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-the-butchery',   image: butcheryImg },
  { venueKey: 'elm_street', venueName: 'אלם סטריט',  sourceUrl: 'https://www.escaperoom.co.il/tel-Aviv-elm-street',     image: elmImg },
  { venueKey: 'wrong_turn', venueName: 'טעות בכיוון', sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-wrong-turn',     image: wrongTurnImg },
]

export default function HomePage() {
  const { slots, loading } = useUpcomingShiftSlots()

  return (
    <div className="animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
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

      {/* ── Upcoming shifts panel ───────────────────────────────── */}
      <section className="max-w-3xl mx-auto mb-4">
        <div className="card overflow-hidden">

          {/* Panel header */}
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

          {/* Slot rows */}
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : slots.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink-400">אין משמרות קרובות מאושרות</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-50">
              {slots.map((slot) => {
                const { primary, secondary, highlight } = formatSlotDate(slot.date)
                const isEvening = slot.shift_type === 'evening'
                return (
                  <div
                    key={`${slot.date}|${slot.shift_type}`}
                    className={`flex items-center gap-5 px-5 py-5 transition-colors ${
                      isEvening ? 'hover:bg-indigo-50/30' : 'hover:bg-amber-50/30'
                    }`}
                  >
                    {/* Date + badge — sits on the right in RTL */}
                    <div className="flex-none w-28 sm:w-32">
                      <p className={`text-sm font-semibold leading-tight ${
                        highlight ? 'text-emerald-600' : 'text-ink-800'
                      }`}>
                        {primary}
                      </p>
                      <p className="text-xs text-ink-400 mt-0.5 leading-snug">{secondary}</p>
                      <div className="mt-2.5">
                        <ShiftBadge type={slot.shift_type} />
                      </div>
                    </div>

                    {/* Vertical separator */}
                    <div className="hidden sm:block w-px bg-ink-100 self-stretch flex-none" />

                    {/* Employee portrait avatars */}
                    <div className="flex items-end gap-3 flex-wrap flex-1">
                      {slot.workers.map(worker => (
                        <EmployeeAvatar key={worker} name={worker} shiftType={slot.shift_type} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer CTA */}
          <Link
            to="/schedule"
            className="flex items-center justify-between px-5 py-4 border-t border-ink-100 bg-ink-50/50 hover:bg-ink-100/60 transition-colors group"
          >
            <span className="text-sm font-medium text-ink-700 group-hover:text-ink-900 transition-colors">
              צפה בלוח המשמרות המלא
            </span>
            <span className="text-xs font-mono text-ink-400 group-hover:text-ink-600 group-hover:-translate-x-1 transition-all inline-block">←</span>
          </Link>
        </div>
      </section>

      {/* ── Action CTAs ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto grid gap-3 sm:grid-cols-2 mb-8">
        {/* Request — secondary priority, ember accent */}
        <Link
          to="/request"
          className="card p-6 flex flex-col gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-ember-500 flex items-center justify-center text-white text-xl font-mono group-hover:opacity-90 transition-opacity">+</div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-1">בקשת משמרת</h2>
            <p className="text-sm text-ink-500 leading-relaxed">שלח בקשה להיכנס למשמרת עתידית</p>
          </div>
          <div className="mt-auto text-xs font-mono text-ink-400 group-hover:text-ink-600 transition-colors flex items-center gap-1">
            <span>שלח בקשה</span>
            <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
          </div>
        </Link>

        {/* Cancel — tertiary priority, muted + dashed */}
        <Link
          to="/cancel"
          className="card p-6 flex flex-col gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-dashed"
        >
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center text-ink-500 text-xl font-mono group-hover:bg-ink-200 transition-colors">×</div>
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

      {/* ── Venue game buttons ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto">
        <div className="card p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-ink-800">בדיקת משחקים שהוזמנו</p>
            <p className="text-xs text-ink-500 mt-1">בדקו ישירות בכל אתר כדי לראות אילו שעות כבר נתפסו.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {manualVenueLinks.map((venue) => (
              <a key={venue.venueKey} href={venue.sourceUrl} target="_blank" rel="noopener noreferrer" className="venue-btn">
                <img src={venue.image} alt={venue.venueName} className="venue-btn__img" />
                <div className="venue-btn__overlay">
                  <p className="venue-btn__name">{venue.venueName}</p>
                  <p className="venue-btn__hint">מעבר לעמוד ההזמנות<span className="venue-btn__arrow">←</span></p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
