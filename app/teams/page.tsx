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
      await supabase
        .from("team_players")
        .insert(
          selected.map((pid) => ({
            team_id: teamId,
            player_id: pid,
            user_id: user.id,
          })),
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

  const deleteTeam = async (id: number) => {
    if (!user) return;
    if (!confirm("Delete this team?")) return;

    await supabase
      .from("team_players")
      .delete()
      .eq("team_id", id)
      .eq("user_id", user.id);

    await supabase
      .from("matches")
      .update({ team_a: null })
      .eq("team_a", id)
      .eq("user_id", user.id);

    await supabase
      .from("matches")
      .update({ team_b: null })
      .eq("team_b", id)
      .eq("user_id", user.id);

    await supabase
      .from("matches")
      .update({ winner: null })
      .eq("winner", id)
      .eq("user_id", user.id);

    await supabase.from("teams").delete().eq("id", id).eq("user_id", user.id);

    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const generateBalancedTeams = async () => {
    if (!user) return;
    const res = await fetch("/api/balanced-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    });
    if (!res.ok) return;
    const { teams: newTeams } = await res.json();
    for (const t of newTeams || []) {
      const { data: inserted } = await supabase
        .from("teams")
        .insert({ name: t.name, user_id: user.id })
        .select()
        .single();
      const teamId = inserted?.id;
      if (teamId) {
        await supabase.from("team_players").insert(
          t.playerIds.map((pid: number) => ({
            team_id: teamId,
            player_id: pid,
            user_id: user.id,
          })),
        );
      }
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
  };

  const playerName = (id: number) =>
    players.find((p) => p.id === id)?.name || "";

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
                disabled={!selected.includes(p.id) && selected.length === 2}
              />
              <span>{p.name}</span>
            </label>
          ))}
          <button
            className="border px-2"
            onClick={addTeam}
            disabled={selected.length !== 2 || !teamName}
          >
            {editingId ? "Update" : "Add"}
          </button>
          <button className="border px-2" onClick={generateBalancedTeams}>
            Balanced teams
          </button>
          {editingId && (
            <button className="border px-2" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>
      <ul className="space-y-1">
        {teams.map((t) => (
          <li key={t.id} className="flex items-center gap-2 border-b pb-1">
            <span className="flex-1">
              {t.name}: {t.playerIds.map(playerName).join(" & ")}
            </span>
            <button className="border px-2 py-0.5" onClick={() => editTeam(t)}>
              Edit
            </button>
            <button
              className="border px-2 py-0.5"
              onClick={() => deleteTeam(t.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
