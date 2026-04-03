import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTodayBookedGames, type BookedGamesResponse, type VenueBookedGames } from '../lib/bookedGames'
import { t } from '../lib/i18n'

const cards = [
  {
    to: '/request',
    label: t.pages.home.requestShift,
    desc: t.pages.home.requestDesc,
    color: 'bg-ember-500',
  },
  {
    to: '/schedule',
    label: t.pages.home.viewSchedule,
    desc: t.pages.home.scheduleDesc,
    color: 'bg-ink-800',
  },
  {
    to: '/cancel',
    label: t.pages.home.cancelShift,
    desc: t.pages.home.cancelDesc,
    color: 'bg-ink-400',
  },
]

function VenueCard({ venue }: { venue: VenueBookedGames }) {
  const hasGames = venue.orderedGames.length > 0

  return (
    <div className="rounded-xl border border-ink-100 bg-parchment/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-ink-900">{venue.venueName}</h3>
        {venue.error ? (
          <span className="text-xs px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700">שגיאה</span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">עודכן</span>
        )}
      </div>

      {venue.error ? (
        <p className="text-sm text-red-700">{venue.error}</p>
      ) : hasGames ? (
        <ul className="grid grid-cols-2 gap-2">
          {venue.orderedGames.map((time) => (
            <li key={`${venue.venueKey}-${time}`} className="text-sm text-ink-800 bg-white rounded-lg border border-ink-100 px-2 py-1.5 text-center font-mono">
              {time}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">לא נמצאו משחקים שהוזמנו להיום.</p>
      )}
    </div>
  )
}

export default function HomePage() {
  const [bookedGames, setBookedGames] = useState<BookedGamesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBookedGames = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTodayBookedGames(signal)
      setBookedGames(data)
    } catch (err) {
      if (signal?.aborted) return
      setError(err instanceof Error ? err.message : 'לא ניתן לטעון את נתוני המשחקים כרגע.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadBookedGames(controller.signal)

    return () => controller.abort()
  }, [loadBookedGames])

  const lastUpdated = useMemo(() => {
    if (!bookedGames?.lastUpdatedAt) return ''
    return new Date(bookedGames.lastUpdatedAt).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [bookedGames?.lastUpdatedAt])

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-12 pt-4">
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-white border border-ink-100 rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-ink-500 tracking-wider">מערכת פעילה</span>
        </div>
        <h1 className="page-header mb-3">{t.pages.home.title}</h1>
        <p className="text-ink-500 text-lg max-w-sm mx-auto leading-relaxed">
          {t.pages.home.subtitle}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
        {cards.map(({ to, label, desc, color }) => (
          <Link key={to} to={to}
            className="card p-6 flex flex-col gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl ${color} transition-opacity group-hover:opacity-90`} />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-1">{label}</h2>
              <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
            </div>
            <div className="mt-auto text-xs font-mono text-ink-400 group-hover:text-ink-600 transition-colors flex items-center gap-1">
              <span>לחץ להמשך</span>
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="max-w-3xl mx-auto mt-8">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-sm font-semibold text-ink-800">משחקים שהוזמנו להיום</p>
              <p className="text-xs text-ink-500 mt-1">
                תאריך: {bookedGames?.date ?? '—'} · אזור זמן: ישראל (Asia/Jerusalem)
              </p>
            </div>
            <button type="button" onClick={() => void loadBookedGames()} className="btn-secondary text-sm self-start">
              רענון
            </button>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-28 rounded-xl border border-ink-100 bg-parchment animate-pulse" />
              <div className="h-28 rounded-xl border border-ink-100 bg-parchment animate-pulse" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {bookedGames?.venues.map((venue) => (
                  <VenueCard key={venue.venueKey} venue={venue} />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                <span>
                  סטטוס טעינה: {bookedGames?.status === 'partial_success' ? 'חלקי' : 'מלא'}
                  {bookedGames?.stale ? ' · נתון מגובה (Cache)' : ''}
                </span>
                {lastUpdated && <span>עודכן לאחרונה: {lastUpdated}</span>}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
