"use client";
import { useEffect, useState } from "react";
import TournamentsView from "../../components/TournamentsView";
import { supabase } from "../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import {
  generateRoundRobinMatches,
  generateKnockoutMatches,
} from "../../utils/scheduleMatches";

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
  format: 'round_robin' | 'knockout';
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
          .select("id, name, format, tournament_teams(team_id)")
          .eq("user_id", userData.user.id);
        const converted = (tourData || []).map((t) => ({
          id: t.id,
          name: t.name,
          format: (t as any).format as 'round_robin' | 'knockout',
          teams:
            t.tournament_teams?.map((tt: any) => ({ id: tt.team_id })) || [],
        }));
        setTournaments(converted);
      }
    };
    load();
  }, []);

  const createTournamentRecord = async (
    name: string,
    format: 'round_robin' | 'knockout'
  ) => {
    const { data: inserted } = await supabase
      .from("tournaments")
      .insert({ name, format, user_id: user.id })
      .select()
      .single();
    return inserted?.id;
  };

  const handleSchedule = async (
    name: string,
    ids: string[],
    format: 'round_robin' | 'knockout'
  ) => {
    if (!user) return;
    if (!name || ids.length === 0) return;

    setLoading(true);
    try {
      const insertedId = await createTournamentRecord(name, format);
      if (insertedId) {
        await supabase.from("tournament_teams").insert(
          ids.map((teamId) => ({ tournament_id: insertedId, team_id: teamId }))
        );

        setTournaments((prev) => [
          ...prev,
          { id: insertedId, name, format, teams: ids.map((id) => ({ id })) },
        ]);
        await generateSchedule(insertedId, format);
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

  const deleteAllTournaments = async () => {
    if (!user) return;
    if (tournaments.length === 0) return;
    if (!confirm("Delete ALL tournaments?")) return;
    setLoading(true);
    try {
      const ids = tournaments.map((t) => t.id);
      await supabase
        .from("matches")
        .delete()
        .in("tournament_id", ids)
        .eq("user_id", user.id);
      await supabase
        .from("tournament_teams")
        .delete()
        .in("tournament_id", ids);
      await supabase
        .from("tournaments")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  async function generateSchedule(
    id: string,
    format: 'round_robin' | 'knockout'
  ) {
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

    let schedule: { team_a: string | number; team_b: string | number | null; phase: string; winner?: string | number | null }[] = [];

    if (format === 'round_robin') {
      const pairs = generateRoundRobinMatches(tms.map((t) => String(t.id)));
      schedule = pairs.map((p) => ({ team_a: p.team_a, team_b: p.team_b, phase: p.phase }));
    } else {
      const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
      if (isPower(tms.length)) {
        const pairs = [] as { team_a: string | number; team_b: string | number; phase: string; winner?: string | number | null }[];
        for (let i = 0; i < tms.length; i += 2) {
          if (tms[i + 1]) {
            pairs.push({ team_a: tms[i].id, team_b: tms[i + 1].id, phase: 'round1' });
          }
        }
        schedule = pairs;
      } else {
        const res = await fetch('/api/best-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teams: tms }),
        });
        const json = await res.json();
        if (res.ok) {
          schedule = (json.matches || []).map((m: any) => {
            const team_a = m.teamA === 'bye' || m.teamA === 'null' ? null : m.teamA;
            const team_b = m.teamB === 'bye' || m.teamB === 'null' ? null : m.teamB;
            const entry: { team_a: number | null; team_b: number | null; phase: string; winner?: number | null } = {
              team_a,
              team_b,
              phase: `round${m.round}`,
            };
            if (team_a && !team_b) entry.winner = team_a;
            if (team_b && !team_a) entry.winner = team_b;
            return entry;
          }).filter((m: any) => m.phase === 'round1');
        } else {
          alert(json.error || 'AI schedule failed');
        }
      }
    }

    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", id)
      .eq("user_id", currentUser.id);

    if (schedule.length) {
      await supabase.from("matches").insert(
        schedule.map((m) => ({
          team_a: m.team_a,
          team_b: m.team_b,
          winner: m.winner ?? null,
          phase: m.phase,
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
      onDeleteAll={deleteAllTournaments}
      loading={loading}
    />
  );
}

