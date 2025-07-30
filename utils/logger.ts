import { supabase } from '../lib/supabaseBrowser'
import { createClient } from '@supabase/supabase-js'

export async function logDebug(message: string, data?: unknown) {
  try {
    const text = data ? `${message}: ${JSON.stringify(data)}` : message
    await supabase.from('logs').insert({ message: text })
  } catch (err) {
    console.error('logDebug failed', err)
  }
}

export async function logServer(message: string, data?: unknown) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase env vars for logServer')
      return
    }
    const serverClient = createClient(supabaseUrl, serviceRoleKey)
    const text = data ? `${message}: ${JSON.stringify(data)}` : message
    await serverClient.from('logs').insert({ message: text })
  } catch (err) {
    console.error('logServer failed', err)
  }
}
