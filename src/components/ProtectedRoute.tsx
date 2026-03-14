import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingState } from './ui'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? 'auth' : 'unauth')
    })
  }, [])

  if (status === 'loading') return <LoadingState />
  if (status === 'unauth') return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
