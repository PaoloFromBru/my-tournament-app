"use client";
import { useState } from "react";

type Player = {
  id: number;
  name: string;
};

type Team = {
  id: number;
  players: [Player, Player];
};

export default function SetupPage() {
  // placeholder players list
  const [players] = useState<Player[]>([
    { id: 1, name: "Player 1" },
    { id: 2, name: "Player 2" },
    { id: 3, name: "Player 3" },
    { id: 4, name: "Player 4" },
  ]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [tournamentName, setTournamentName] = useState("");

  const addTeam = () => {
    if (selected.length === 2) {
      const nextId = teams.length ? teams[teams.length - 1].id + 1 : 1;
      const teamPlayers = players.filter((p) => selected.includes(p.id)) as [
        Player,
        Player
      ];
      setTeams([...teams, { id: nextId, players: teamPlayers }]);
      setSelected([]);
    }
  };

  const createTournament = () => {
    alert(`Tournament '${tournamentName}' with ${teams.length} teams created.`);
    setTournamentName("");
    setTeams([]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournament Setup</h2>
      <div>
        <h3 className="font-semibold">Create Teams</h3>
        <div className="space-x-2">
          {players.map((p) => (
            <label key={p.id} className="space-x-1">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected([...selected, p.id]);
                  } else {
                    setSelected(selected.filter((id) => id !== p.id));
                  }
                }}
              />
              <span>{p.name}</span>
            </label>
          ))}
          <button className="border px-2" onClick={addTeam} disabled={selected.length !== 2}>
            Add Team
          </button>
        </div>
        <ul className="list-disc pl-5">
          {teams.map((t) => (
            <li key={t.id}>
              Team {t.id}: {t.players[0].name} & {t.players[1].name}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Create Tournament</h3>
        <input
          className="border p-1"
          placeholder="Tournament name"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
        />
        <button className="border px-2" onClick={createTournament} disabled={!tournamentName || teams.length === 0}>
          Create
        </button>
      </div>
    </div>
  );
}
