import { useEffect, useState } from 'react'
import { supabase, type Employee } from '../lib/supabase'

const REQUIRED_EMPLOYEES = ['יהב', 'אביב', 'סטיבן', 'דור'] as const

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order')

      const safeData = (data ?? []) as Employee[]
      const existingNames = new Set(safeData.map(employee => employee.name))
      const fallbackEmployees = REQUIRED_EMPLOYEES
        .filter(name => !existingNames.has(name))
        .map((name, idx) => ({
          id: `fallback-${name}`,
          name,
          sort_order: safeData.length + idx + 1,
        }))

      setEmployees([...(safeData as Employee[]), ...(fallbackEmployees as Employee[])])

      if (error) {
        console.error('Failed to load employees from Supabase. Falling back to required list.', error)
      }

      setLoading(false)
    }

    fetchEmployees()
  }, [])

  return { employees, loading }
}
