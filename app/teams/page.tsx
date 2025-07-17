"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";

interface Player {
  id: number;
  name: string;
  offense: number;
  defense: number;
  user_id: string;
}

interface TeamRow {
  id: number;
  team_name: string;
  player1_id: number;
  player2_id: number;
  user_id: string;
}

export default function TeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamName, setTeamName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("user_id", userData.user.id);
        setPlayers(playerData || []);

        const { data: teamData } = await supabase
          .from("team_players")
          .select("*")
          .eq("user_id", userData.user.id);
        setTeams(teamData || []);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setTeamName("");
    setSelected([]);
    setEditingId(null);
  };

  const addTeam = async () => {
    if (!user || selected.length !== 2 || !teamName) return;

    if (editingId !== null) {
      await supabase
        .from("team_players")
        .update({
          team_name: teamName,
          player1_id: selected[0],
          player2_id: selected[1],
        })
        .eq("id", editingId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("team_players").insert({
        team_name: teamName,
        player1_id: selected[0],
        player2_id: selected[1],
        user_id: user.id,
      });
    }

    const { data } = await supabase
      .from("team_players")
      .select("*")
      .eq("user_id", user.id);
    setTeams(data || []);
    resetForm();
  };

  const editTeam = (t: TeamRow) => {
    setTeamName(t.team_name);
    setSelected([t.player1_id, t.player2_id]);
    setEditingId(t.id);
  };

  const playerName = (id: number) => players.find((p) => p.id === id)?.name || "";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Teams</h2>
      <div className="space-y-2">
        <input
          className="border p-1"
          placeholder="Team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
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
                disabled={
                  !selected.includes(p.id) && selected.length === 2
                }
              />
              <span>{p.name}</span>
            </label>
          ))}
          <button className="border px-2" onClick={addTeam} disabled={selected.length !== 2 || !teamName}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button className="border px-2" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <ul className="list-disc pl-5">
        {teams.map((t) => (
          <li key={t.id}>
            {t.team_name}: {playerName(t.player1_id)} & {playerName(t.player2_id)}
            <button className="ml-2 text-blue-600" onClick={() => editTeam(t)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
