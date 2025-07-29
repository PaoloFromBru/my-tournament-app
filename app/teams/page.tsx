"use client";
import { useEffect, useState } from "react";
import TeamsView, { Team } from "../../components/TeamsView";
import { supabase } from "../../lib/supabaseBrowser";

interface Player {
  id: string;
  name: string;
  skills: Record<string, number>;
}

interface TeamRow {
  id: string;
  name: string;
  playerIds: string[];
}

export default function TeamsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sportId, setSportId] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load preferred sport
  useEffect(() => {
    if (!userId) return;
    const fetchSport = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("sport_id")
        .eq("user_id", userId)
        .single();
      if (data?.sport_id) setSportId(data.sport_id as string);
    };
    fetchSport();
  }, [userId]);

  // Load sport info (team size)
  useEffect(() => {
    if (!sportId) return;
    const getSportInfo = async () => {
      const { data } = await supabase
        .from("sports")
        .select("team_size")
        .eq("id", sportId)
        .single();
      if (data?.team_size) setTeamSize(data.team_size as number);
    };
    getSportInfo();
  }, [sportId]);

  // Load players and teams
  useEffect(() => {
    if (!sportId || !userId) return;
    const load = async () => {
      const { data: rows } = await supabase
        .from("player_profiles")
        .select("skills, players(id, name)")
        .eq("sport_id", sportId)
        .eq("players.user_id", userId)
        .order("name", { foreignTable: "players" });

      const playersWithSkills = (rows || [])
        .filter((r: any) => r.players)
        .map((r: any) => ({
          id: r.players.id,
          name: r.players.name,
          skills: r.skills || {},
        })) as Player[];

      setPlayers(playersWithSkills);

      const [{ data: teamRows }, { data: teamPlayerRows }] = await Promise.all([
        supabase
          .from("teams")
          .select("*")
          .eq("user_id", userId)
          .eq("sport_id", sportId),
        supabase.from("team_players").select("*").eq("user_id", userId),
      ]);

      const combined: TeamRow[] = (teamRows || []).map((t) => ({
        id: t.id,
        name: t.name,
        playerIds: (teamPlayerRows || [])
          .filter((tp) => tp.team_id === t.id)
          .map((tp) => tp.player_id),
      }));

      setTeams(combined);
    };
    load();
  }, [sportId, userId]);

  const refreshTeams = async (uid: string, sid: string | null) => {
    const [{ data: teamRows }, { data: teamPlayerRows }] = await Promise.all([
      supabase
        .from("teams")
        .select("*")
        .eq("user_id", uid)
        .eq("sport_id", sid),
      supabase.from("team_players").select("*").eq("user_id", uid),
    ]);
    const combined: TeamRow[] = (teamRows || []).map((t) => ({
      id: t.id,
      name: t.name,
      playerIds: (teamPlayerRows || [])
        .filter((tp) => tp.team_id === t.id)
        .map((tp) => tp.player_id),
    }));
    setTeams(combined);
  };

  const addTeam = async (name: string, memberIds: string[]) => {
    if (!userId || !sportId) return;
    if (!name || memberIds.length !== teamSize) return;
    const { data: inserted } = await supabase
      .from("teams")
      .insert({ name, user_id: userId, sport_id: sportId })
      .select()
      .single();
    const teamId = inserted?.id;
    if (teamId) {
      await supabase.from("team_players").insert(
        memberIds.map((pid) => ({ team_id: teamId, player_id: pid, user_id: userId }))
      );
    }
    await refreshTeams(userId, sportId);
  };

  const editTeam = async (team: TeamRow) => {
    if (!userId) return;
    const name = window.prompt("Team name", team.name) ?? team.name;
    const currentNames = team.playerIds
      .map((id) => players.find((p) => p.id === id)?.name || "")
      .join(",");
    const namesStr = window.prompt(
      `Player names (comma separated, choose ${teamSize} from ${players
        .map((p) => p.name)
        .join(", ")})`,
      currentNames
    );
    const names = namesStr
      ? namesStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, teamSize)
      : currentNames.split(",").map((s) => s.trim()).filter(Boolean);
    const ids = names
      .map((n) => players.find((p) => p.name === n)?.id)
      .filter((id): id is string => Boolean(id));
    if (!name || ids.length !== teamSize) return;

    await supabase
      .from("teams")
      .update({ name })
      .eq("id", team.id)
      .eq("user_id", userId);
    await supabase
      .from("team_players")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", userId);
    await supabase.from("team_players").insert(
      ids.map((pid) => ({ team_id: team.id, player_id: pid, user_id: userId }))
    );
    await refreshTeams(userId, sportId);
  };

  const deleteTeam = async (id: string) => {
    if (!userId) return;
    if (!confirm("Delete this team?")) return;
    await supabase.from("team_players").delete().eq("team_id", id).eq("user_id", userId);
    await supabase.from("matches").update({ team_a: null }).eq("team_a", id).eq("user_id", userId);
    await supabase.from("matches").update({ team_b: null }).eq("team_b", id).eq("user_id", userId);
    await supabase.from("matches").update({ winner: null }).eq("winner", id).eq("user_id", userId);
    await supabase.from("teams").delete().eq("id", id).eq("user_id", userId);
    setTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteAllTeams = async () => {
    if (!userId) return;
    if (teams.length === 0) return;
    if (!confirm("Delete ALL teams?")) return;
    setLoading(true);
    try {
      const ids = teams.map((t) => t.id);
      await supabase.from("team_players").delete().in("team_id", ids).eq("user_id", userId);
      await supabase.from("matches").update({ team_a: null }).in("team_a", ids).eq("user_id", userId);
      await supabase.from("matches").update({ team_b: null }).in("team_b", ids).eq("user_id", userId);
      await supabase.from("matches").update({ winner: null }).in("winner", ids).eq("user_id", userId);
      await supabase.from("teams").delete().in("id", ids).eq("user_id", userId);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const setGeneratedTeams = async (newTeams: Team[]) => {
    if (!userId || !sportId) return;
    setLoading(true);
    for (const t of newTeams) {
      const { data: inserted } = await supabase
        .from("teams")
        .insert({ name: t.name, user_id: userId, sport_id: sportId })
        .select()
        .single();
      const teamId = inserted?.id;
      if (teamId) {
        await supabase.from("team_players").insert(
          t.playerIds.map((pid) => ({ team_id: teamId, player_id: pid, user_id: userId }))
        );
      }
    }
    await refreshTeams(userId, sportId);
    setLoading(false);
  };

  return (
    <TeamsView
      teams={teams}
      players={players}
      teamSize={teamSize}
      onAdd={addTeam}
      onEdit={editTeam}
      onDelete={deleteTeam}
      onSetTeams={setGeneratedTeams}
      onDeleteAll={deleteAllTeams}
      loading={loading}
    />
  );
}
