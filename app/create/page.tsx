'use client';
import { useState } from 'react';

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState({ name: '', sport: '', teams: [] as { name: string }[] });

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
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            onClick={() => console.log('Create tournament', tournament)}
          >
            Start Tournament
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
