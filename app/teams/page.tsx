"use client";
import { FormEvent, useEffect, useState } from "react";
import TeamsView from "../../components/TeamsView";
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


  const addTeam = async (name: string, memberIds: number[]) => {
    if (!user) return;
    if (!name || memberIds.length !== 2) return;

    const { data: inserted } = await supabase
      .from("teams")
      .insert({ name, user_id: user.id })
      .select()
      .single();

    const teamId = inserted?.id;

    if (teamId) {
      await supabase.from("team_players").insert(
        memberIds.map((pid) => ({ team_id: teamId, player_id: pid, user_id: user.id })),
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
  };

  const editTeam = async (team: TeamRow) => {
    if (!user) return;
    const name = window.prompt("Team name", team.name) ?? team.name;
    const idsStr = window.prompt(
      `Player IDs (comma separated, choose two from ${players
        .map((p) => p.id)
        .join(", ")})`,
      team.playerIds.join(","),
    );
    const ids = idsStr
      ? idsStr
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n))
          .slice(0, 2)
      : team.playerIds;
    if (!name || ids.length !== 2) return;

    await supabase
      .from("teams")
      .update({ name })
      .eq("id", team.id)
      .eq("user_id", user.id);

    await supabase
      .from("team_players")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", user.id);

    await supabase.from("team_players").insert(
      ids.map((pid) => ({ team_id: team.id, player_id: pid, user_id: user.id })),
    );

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

  return (
    <TeamsView
      teams={teams}
      players={players}
      onAdd={addTeam}
      onEdit={editTeam}
      onDelete={deleteTeam}
      onGenerateBalanced={generateBalancedTeams}
    />
  );
}
