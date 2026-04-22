import { GAME_CONFIG, type BookingsForDate, type GameType } from '../lib/gameBookings'

export function BookedGamesPanel({ bookings }: { bookings: BookingsForDate }) {
  const gameOrder: GameType[] = ['elmStreet', 'butchery', 'wrongTurn']
  const hasAnyBookings = gameOrder.some((gameType) => bookings[gameType].length > 0)

  return (
    <section className="mt-3 rounded-xl border border-ink-100 bg-parchment/45 p-3">
      <h4 className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">משחקים שהוזמנו</h4>

      {!hasAnyBookings ? (
        <p className="text-sm text-ink-400">אין משחקים מעודכנים כרגע</p>
      ) : (
        <div className="flex flex-col gap-2">
          {gameOrder.map((gameType) => {
            const slots = bookings[gameType]
            if (slots.length === 0) return null

            return (
              <div key={gameType} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm font-medium text-ink-700 min-w-28">{GAME_CONFIG[gameType].label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((slot) => (
                    <span
                      key={slot}
                      className={`px-2.5 py-1 rounded-full border text-xs font-mono ${GAME_CONFIG[gameType].chipClass}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
