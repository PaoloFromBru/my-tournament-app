"use client";
import { useEffect, useState } from "react";
import TournamentsView from "../../components/TournamentsView";
import { supabase } from "../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
}

interface TournamentTeam {
  id: string;
}

interface Tournament {
  id: string;
  name: string;
  teams: TournamentTeam[];
}

export default function TournamentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("user_id", userData.user.id);
        setTeams(teamsData || []);

        const { data: tourData } = await supabase
          .from("tournaments")
          .select("id, name, tournament_teams(team_id)")
          .eq("user_id", userData.user.id);
        const converted = (tourData || []).map((t) => ({
          id: t.id,
          name: t.name,
          teams:
            t.tournament_teams?.map((tt: any) => ({ id: tt.team_id })) || [],
        }));
        setTournaments(converted);
      }
    };
    load();
  }, []);

  const createTournamentRecord = async (name: string) => {
    const { data: inserted } = await supabase
      .from("tournaments")
      .insert({ name, user_id: user.id })
      .select()
      .single();
    return inserted?.id;
  };

  const handleSchedule = async (name: string, ids: string[]) => {
    if (!user) return;
    if (!name || ids.length === 0) return;

    setLoading(true);
    try {
      const insertedId = await createTournamentRecord(name);
      if (insertedId) {
        await supabase.from("tournament_teams").insert(
          ids.map((teamId) => ({ tournament_id: insertedId, team_id: teamId }))
        );

        setTournaments((prev) => [
          ...prev,
          { id: insertedId, name, teams: ids.map((id) => ({ id })) },
        ]);
        await generateSchedule(insertedId);
      }
    } finally {
      setLoading(false);
    }
  };


  const deleteTournament = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this tournament?")) return;
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", id)
      .eq("user_id", user.id);
    await supabase
      .from("tournament_teams")
      .delete()
      .eq("tournament_id", id);
    await supabase
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  async function generateSchedule(id: string) {
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) {
      return;
    }

    const { data: teamData } = await supabase
      .from("tournament_teams")
      .select("team_id, teams(id, name, user_id)")
      .eq("tournament_id", id)
      .eq("teams.user_id", currentUser.id);

    const tms = (teamData || []).map((tt: any) => ({
      id: tt.team_id,
      name: tt.teams?.name ?? "",
    }));
    if (tms.length < 2) {
      return;
    }

    const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
    let schedule: { matches: { round: number; teamA: number | null; teamB: number | null; winner?: number | null }[] } & {
      debug?: string[];
    } = { matches: [] };

    if (isPower(tms.length)) {
      const pairs = [] as { round: number; teamA: number; teamB: number }[];
      for (let i = 0; i < tms.length; i += 2) {
        if (tms[i + 1]) {
          pairs.push({ round: 1, teamA: tms[i].id, teamB: tms[i + 1].id });
        }
      }
      schedule.matches = pairs;
    } else {
      const res = await fetch("/api/best-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: tms }),
      });
      const json = await res.json();
      if (res.ok) {
        schedule = json;
        schedule.matches = schedule.matches
          .map((m: any) => {
            const teamA = m.teamA === "bye" || m.teamA === "null" ? null : m.teamA;
            const teamB = m.teamB === "bye" || m.teamB === "null" ? null : m.teamB;
            let winner = null as number | null;
            if (teamA && !teamB) winner = teamA;
            if (teamB && !teamA) winner = teamB;
            return { round: m.round, teamA, teamB, winner };
          })
          .filter((m: any) => m.round === 1);
      } else {
        alert(json.error || "AI schedule failed");
      }
    }

    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", id)
      .eq("user_id", currentUser.id);

    if (schedule.matches.length) {
      await supabase.from("matches").insert(
        schedule.matches.map((m) => ({
          team_a: m.teamA,
          team_b: m.teamB,
          winner: m.winner,
          phase: `round${m.round}`,
          scheduled_at: null,
          tournament_id: id,
          user_id: currentUser.id,
        }))
      );
    }
  }

  return (
    <TournamentsView
      tournaments={tournaments}
      teams={teams}
      onSchedule={handleSchedule}
      onRun={(id) => router.push(`/run/${id}`)}
      onView={(id) => router.push(`/tournaments/${id}`)}
      onShare={(id) => router.push(`/tournaments/${id}/public`)}
      onDelete={deleteTournament}
      loading={loading}
    />
  );
}

