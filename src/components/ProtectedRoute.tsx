import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingState } from './ui'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading')

  useEffect(() => {
    // Subscribe to auth changes — handles session expiry while on admin page
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session?.user ? 'auth' : 'unauth')
    })
    // Also check immediately for initial render
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? 'auth' : 'unauth')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'unauth') return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
