import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export type ShiftType = 'morning' | 'evening'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type CancelStatus = 'pending' | 'approved' | 'rejected'
export type ApprovedShiftStatus = 'approved' | 'canceled'

export interface ShiftRequest {
  id: string
  name: string
  date: string
  shift_type: ShiftType
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
}

export interface ApprovedShift {
  id: string
  name: string
  date: string
  shift_type: ShiftType
  notes: string | null
  status: ApprovedShiftStatus
  shift_request_id: string | null
  created_at: string
  updated_at: string
}

export interface CancelRequest {
  id: string
  name: string
  date: string
  shift_type: ShiftType
  reason: string | null
  status: CancelStatus
  approved_shift_id: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}
