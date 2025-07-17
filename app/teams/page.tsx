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
  name: string;
  playerIds: number[];
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

        const { data: teamRows } = await supabase
          .from("teams")
          .select("*")
          .eq("user_id", userData.user.id);

        const { data: teamPlayerRows } = await supabase
          .from("team_players")
          .select("*")
          .eq("user_id", userData.user.id);

        const combined: TeamRow[] = (teamRows || []).map((t) => ({
          id: t.id,
          name: t.name,
          playerIds: (teamPlayerRows || [])
            .filter((tp) => tp.team_id === t.id)
            .map((tp) => tp.player_id),
        }));

        setTeams(combined);
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

    let teamId = editingId;

    if (editingId !== null) {
      await supabase
        .from("teams")
        .update({ name: teamName })
        .eq("id", editingId)
        .eq("user_id", user.id);

      await supabase
        .from("team_players")
        .delete()
        .eq("team_id", editingId)
        .eq("user_id", user.id);
    } else {
      const { data: inserted } = await supabase
        .from("teams")
        .insert({ name: teamName, user_id: user.id })
        .select()
        .single();
      teamId = inserted?.id ?? null;
    }

    if (teamId) {
      await supabase.from("team_players").insert(
        selected.map((pid) => ({ team_id: teamId, player_id: pid, user_id: user.id }))
      );
    }

    const { data: teamRows } = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", user.id);

    const { data: teamPlayerRows } = await supabase
      .from("team_players")
      .select("*")
      .eq("user_id", user.id);

    const combined: TeamRow[] = (teamRows || []).map((t) => ({
      id: t.id,
      name: t.name,
      playerIds: (teamPlayerRows || [])
        .filter((tp) => tp.team_id === t.id)
        .map((tp) => tp.player_id),
    }));

    setTeams(combined);
    resetForm();
  };

  const editTeam = (t: TeamRow) => {
    setTeamName(t.name);
    setSelected(t.playerIds);
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
            {t.name}: {t.playerIds.map(playerName).join(" & ")}
            <button className="ml-2 text-blue-600" onClick={() => editTeam(t)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
