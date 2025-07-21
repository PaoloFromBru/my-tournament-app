import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function cleanup() {
  const tables = [
    'matches',
    'team_players',
    'teams',
    'tournaments',
    'players'
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .is('user_id', null);
    if (error) {
      console.error(`Failed cleaning ${table}:`, error.message);
    }
  }
}

cleanup()
  .then(() => console.log('Cleanup complete'))
  .catch((err) => {
    console.error('Cleanup failed', err.message);
    process.exit(1);
  });
