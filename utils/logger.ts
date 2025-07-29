import { supabase } from '../lib/supabaseBrowser'

export async function logDebug(message: string, data?: unknown) {
  try {
    const text = data ? `${message}: ${JSON.stringify(data)}` : message
    await supabase.from('logs').insert({ message: text })
  } catch (err) {
    console.error('logDebug failed', err)
  }
}
