import { Link } from 'react-router-dom'
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

const manualVenueLinks = [
  {
    venueKey: 'butchery',
    venueName: 'הקצביה',
    sourceUrl: 'https://www.escaperoom.co.il/tel-aviv-the-butchery',
  },
  {
    venueKey: 'elm_street',
    venueName: 'אלם סטריט',
    sourceUrl: 'https://www.escaperoom.co.il/tel-Aviv-elm-street',
  },
]

export default function HomePage() {
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
          <div className="mb-5">
            <p className="text-sm font-semibold text-ink-800">בדיקה ידנית של המשחקים שהוזמנו להיום</p>
            <p className="text-xs text-ink-500 mt-1">
              בדקו ישירות בכל אתר כדי לראות אילו שעות כבר נתפסו.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {manualVenueLinks.map((venue) => (
              <a
                key={venue.venueKey}
                href={venue.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-ink-100 bg-parchment/60 p-4 hover:bg-parchment transition-colors"
              >
                <p className="font-semibold text-ink-900">{venue.venueName}</p>
                <p className="text-xs text-ink-500 mt-1">מעבר לעמוד ההזמנות</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
