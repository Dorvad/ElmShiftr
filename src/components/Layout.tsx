import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const isAdmin = location.pathname.startsWith('/admin')

  const publicLinks = [
    { to: '/', label: t.nav.home },
    { to: '/schedule', label: t.nav.schedule },
    { to: '/request', label: t.nav.request },
    { to: '/cancel', label: t.nav.cancel },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <header className="bg-ink-950 text-bone sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-ember-500 flex items-center justify-center text-white font-display font-bold text-sm group-hover:bg-ember-400 transition-colors">
              E
            </span>
            <span className="font-display font-semibold text-base tracking-tight hidden sm:block">
              {t.appName}
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {!isAdmin && publicLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  location.pathname === to
                    ? 'bg-ink-800 text-bone'
                    : 'text-ink-300 hover:text-bone hover:bg-ink-800'
                }`}>
                {label}
              </Link>
            ))}
            {isAdmin && user && (
              <>
                <Link to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/admin' ? 'bg-ink-800 text-bone' : 'text-ink-300 hover:text-bone hover:bg-ink-800'
                  }`}>
                  {t.nav.adminDashboard}
                </Link>
                <button onClick={() => supabase.auth.signOut()}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-300 hover:text-bone hover:bg-ink-800 transition-colors">
                  {t.nav.logout}
                </button>
              </>
            )}
            {!isAdmin && (
              <Link to="/admin/login"
                className="mr-1 px-3 py-1.5 rounded-lg text-sm font-medium text-ink-500 hover:text-ink-300 transition-colors">
                {t.nav.adminLogin}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-ink-100 bg-parchment">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-mono text-ink-400">{t.appName}</span>
          <span className="text-xs text-ink-400">{t.appTagline}</span>
        </div>
      </footer>
    </div>
  )
}
