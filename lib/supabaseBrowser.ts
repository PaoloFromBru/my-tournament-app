import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export const supabase =
  globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseKey)

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase
}
