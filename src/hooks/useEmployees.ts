import { useEffect, useState } from 'react'
import { supabase, type Employee } from '../lib/supabase'

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setEmployees(data as Employee[])
        setLoading(false)
      })
  }, [])

  return { employees, loading }
}
