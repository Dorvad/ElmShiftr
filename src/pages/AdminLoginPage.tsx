import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { Alert, Spinner } from '../components/ui'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      navigate('/admin')
    } catch {
      setError(t.errors.loginFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-sm mx-auto pt-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-ink-950 flex items-center justify-center mx-auto mb-4">
          <span className="font-display text-2xl font-bold text-bone">E</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">{t.pages.adminLogin.title}</h1>
        <p className="text-ink-500 text-sm mt-1">{t.pages.adminLogin.subtitle}</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <Alert type="error" message={error} />}
          <div>
            <label className="label">{t.form.email}</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">{t.form.password}</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <><Spinner size="sm" />{t.form.loggingIn}</> : t.form.login}
          </button>
        </form>
      </div>
    </div>
  )
}
