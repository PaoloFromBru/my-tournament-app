'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DemoPage() {
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', 'a073d974-4da1-4fd1-a026-3db7a9bebca0')
        .single();
      setTournament(t);

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', t?.id);
      setTeams(teamData || []);
    };
    load();
  }, []);

  if (!tournament) return <p className="p-6 text-center text-gray-500">Loading demo...</p>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4 text-center">
        Demo: {tournament.name}
      </h1>
      <p className="text-center text-gray-600 mb-6">Sport: {tournament.sport}</p>

      <ul className="bg-white shadow rounded-lg p-6 space-y-2">
        {teams.map(team => (
          <li key={team.id} className="text-lg text-gray-700">
            ⚽ {team.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
