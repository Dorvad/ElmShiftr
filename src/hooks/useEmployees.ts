import { useEffect, useState } from 'react'
import { supabase, type Employee } from '../lib/supabase'

const REQUIRED_EMPLOYEES = ['יהב', 'אביב', 'סטיבן', 'דור'] as const

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
        if (data) {
          const existingNames = new Set(data.map(employee => employee.name))
          const fallbackEmployees = REQUIRED_EMPLOYEES
            .filter(name => !existingNames.has(name))
            .map((name, idx) => ({
              id: `fallback-${name}`,
              name,
              sort_order: data.length + idx + 1,
            }))

          setEmployees([...(data as Employee[]), ...(fallbackEmployees as Employee[])])
        }
        setLoading(false)
      })
  }, [])

  return { employees, loading }
}
