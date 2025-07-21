'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState({ name: '', sport: '', teams: [] as { name: string }[] });
  const [loading, setLoading] = useState(false);

  const handleCreateTournament = async () => {
    setLoading(true);
    const tournamentId = crypto.randomUUID();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    const { error: tournamentError } = await supabase.from('tournaments').insert([
      {
        id: tournamentId,
        name: tournament.name,
        sport: tournament.sport,
        user_id: userId,
      },
    ]);

    if (tournamentError) {
      alert('Error creating tournament');
      setLoading(false);
      return;
    }

    const teamInserts = tournament.teams.map((t) => ({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      name: t.name,
      user_id: userId,
    }));
    const teamIds = teamInserts.map((t) => t.id);

    const { error: teamError } = await supabase.from('teams').insert(teamInserts);

    if (teamError) {
      alert('Error adding teams');
      setLoading(false);
      return;
    }

    await supabase.from('tournament_teams').insert(
      teamIds.map((id) => ({ tournament_id: tournamentId, team_id: id, user_id: userId }))
    );

    const pairs: { team_a: string; team_b: string | null }[] = [];
    for (let i = 0; i < teamIds.length; i += 2) {
      pairs.push({ team_a: teamIds[i], team_b: teamIds[i + 1] ?? null });
    }
    if (pairs.length) {
      await supabase.from('matches').insert(
        pairs.map((p) => ({
          team_a: p.team_a,
          team_b: p.team_b,
          phase: 'round1',
          scheduled_at: null,
          tournament_id: tournamentId,
          user_id: userId,
        }))
      );
    }

    setLoading(false);
    const dest = userId ? `/run/${tournamentId}` : `/public/run/${tournamentId}`;
    window.location.href = dest;
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Create a Tournament</h1>

      {step === 1 && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Tournament Name"
            className="w-full border rounded px-4 py-2"
            value={tournament.name}
            onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
          />
          <select
            className="w-full border rounded px-4 py-2"
            value={tournament.sport}
            onChange={(e) => setTournament({ ...tournament, sport: e.target.value })}
          >
            <option value="">Select Sport</option>
            <option value="babyfoot">Babyfoot</option>
            <option value="padel">Padel</option>
            <option value="pingpong">Ping Pong</option>
          </select>
          <button
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
            onClick={() => setStep(2)}
          >
            Next: Add Teams
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Teams</h2>
          <TeamInput teams={tournament.teams} setTournament={setTournament} />
          <button
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            onClick={handleCreateTournament}
          >
            {loading ? 'Creating...' : 'Start Tournament'}
          </button>
        </div>
      )}
    </main>
  );
}

function TeamInput({ teams, setTournament }: { teams: { name: string }[]; setTournament: React.Dispatch<React.SetStateAction<{ name: string; sport: string; teams: { name: string }[] }>> }) {
  const [teamName, setTeamName] = useState('');
  const addTeam = () => {
    if (teamName.trim() === '') return;
    setTournament((prev) => ({
      ...prev,
      teams: [...prev.teams, { name: teamName }]
    }));
    setTeamName('');
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Add a team"
        className="w-full border rounded px-4 py-2"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <button
        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        onClick={addTeam}
      >
        Add Team
      </button>
      <ul className="list-disc pl-5 mt-3 text-gray-700">
        {teams.map((t, i) => (
          <li key={i}>{t.name}</li>
        ))}
      </ul>
    </div>
  );
}
