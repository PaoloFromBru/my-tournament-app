import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(url, key)

export async function POST() {
  const tables = [
    'matches',
    'tournament_teams',
    'team_players',
    'teams',
    'tournaments',
    'players'
  ]

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .or('user_id.is.null,user_id.eq.""')
    if (error) {
      console.error(`Failed cleaning ${table}:`, error.message)
    }
  }

  return NextResponse.json({ success: true })
}
