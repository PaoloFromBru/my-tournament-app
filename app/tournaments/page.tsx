"use client";
import { FormEvent, useEffect, useState } from "react";
import TournamentsView from "../../components/TournamentsView";
import { supabase } from "../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";

interface Team {
  id: number;
  name: string;
}

interface TournamentTeam {
  id: number;
}

interface Tournament {
  id: number;
  name: string;
  teams: TournamentTeam[];
}

export default function TournamentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

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
          .select("id, name, teams(id)")
          .eq("user_id", userData.user.id);
        const converted = (tourData || []).map((t) => ({
          id: t.id,
          name: t.name,
          teams: t.teams || [],
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

  const handleSchedule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem("tournamentName") as HTMLInputElement).value;
    const teamInputs = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[name='teamSelection']:checked")
    );
    const ids = teamInputs.map((inp) => Number(inp.value));
    if (!name || ids.length === 0) return;

    const insertedId = await createTournamentRecord(name);
    if (insertedId) {
      await supabase
        .from("teams")
        .update({ tournament_id: insertedId })
        .in("id", ids)
        .eq("user_id", user.id);

      setTournaments((prev) => [
        ...prev,
        { id: insertedId, name, teams: ids.map((id) => ({ id })) },
      ]);
      await generateSchedule(insertedId);
    }

    form.reset();
  };

  const createEmptyTournament = async () => {
    if (!user) return;
    const name = window.prompt("Tournament name") || "";
    if (!name) return;
    const insertedId = await createTournamentRecord(name);
    if (insertedId) {
      setTournaments((prev) => [
        ...prev,
        { id: insertedId, name, teams: [] },
      ]);
    }
  };

  const deleteTournament = async (id: number) => {
    if (!user) return;
    if (!confirm("Delete this tournament?")) return;
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", id)
      .eq("user_id", user.id);
    await supabase
      .from("teams")
      .update({ tournament_id: null })
      .eq("tournament_id", id)
      .eq("user_id", user.id);
    await supabase
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  async function generateSchedule(id: number) {
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) {
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("user_id", currentUser.id)
      .eq("tournament_id", id);

    const tms = teamData || [];
    if (tms.length < 2) {
      return;
    }

    const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
    let schedule: { matches: { round: number; teamA: number; teamB: number }[] } & {
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
      onCreate={createEmptyTournament}
      onRun={(id) => router.push(`/run/${id}`)}
      onView={(id) => router.push(`/tournaments/${id}`)}
      onDelete={deleteTournament}
    />
  );
}

