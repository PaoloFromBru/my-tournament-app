"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";

type Player = {
  id: number;
  name: string;
  offense: number;
  defense: number;
  user_id: string;
};

type Team = {
  id: number;
  players: [Player, Player];
};

export default function SetupPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [present, setPresent] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [tournamentName, setTournamentName] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', userData.user.id);
        setPlayers(data || []);
        setPresent((data || []).map((p) => p.id));
      }
    };
    load();
  }, []);

  const addTeam = () => {
    if (selected.length === 2) {
      const teamPlayers = players.filter((p) => selected.includes(p.id)) as [
        Player,
        Player
      ];
      if (editingTeam !== null) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === editingTeam ? { id: t.id, players: teamPlayers } : t
          )
        );
        setEditingTeam(null);
      } else {
        const nextId = teams.length ? teams[teams.length - 1].id + 1 : 1;
        setTeams([...teams, { id: nextId, players: teamPlayers }]);
      }
      setSelected([]);
    }
  };

  const editTeam = (team: Team) => {
    setSelected(team.players.map((p) => p.id));
    setEditingTeam(team.id);
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
        <h3 className="font-semibold">Players Present</h3>
        <div className="space-x-2">
          {players.map((p) => (
            <label key={p.id} className="space-x-1">
              <input
                type="checkbox"
                checked={present.includes(p.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPresent([...present, p.id]);
                  } else {
                    setPresent(present.filter((id) => id !== p.id));
                    setSelected(selected.filter((id) => id !== p.id));
                  }
                }}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold">Create Teams</h3>
        <div className="space-x-2">
          {players
            .filter((p) => present.includes(p.id))
            .map((p) => (
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
          <button className="border border-green-500 px-2" onClick={addTeam} disabled={selected.length !== 2}>
            {editingTeam ? 'Update Team' : 'Add Team'}
          </button>
          {editingTeam && (
            <button className="border px-2" onClick={() => {setEditingTeam(null); setSelected([]);}}>
              Cancel
            </button>
          )}
        </div>
        <ul className="list-disc pl-5">
          {teams.map((t) => (
            <li key={t.id}>
              Team {t.id}: {t.players[0].name} & {t.players[1].name}
              <button className="ml-2 border border-blue-500 px-1" onClick={() => editTeam(t)}>
                Edit
              </button>
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
          <button className="border border-green-500 px-2" onClick={createTournament} disabled={!tournamentName || teams.length === 0}>
            Create
          </button>
      </div>
    </div>
  );
}
