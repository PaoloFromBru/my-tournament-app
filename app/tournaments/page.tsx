"use client";
import { useEffect, useState } from "react";
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
  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [debug, setDebug] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

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

  const toggleTeam = (id: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((tid) => tid !== id)));
  };

  const createTournament = async () => {
    if (!user || !name || selected.length === 0) return;
    setDebug([]);
    const { data: inserted } = await supabase
      .from("tournaments")
      .insert({
        name,
        user_id: user.id,
      })
      .select()
      .single();

    if (inserted?.id) {
      await supabase
        .from("teams")
        .update({ tournament_id: inserted.id })
        .in("id", selected)
        .eq("user_id", user.id);
      setTournaments((prev) => [
        ...prev,
        { id: inserted.id, name: inserted.name, teams: selected.map((id) => ({ id })) },
      ]);
      await generateSchedule(inserted.id);
    }

    setName("");
    setSelected([]);
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
    setLoadingId(id);
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (!currentUser) {
      setLoadingId(null);
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("user_id", currentUser.id)
      .eq("tournament_id", id);

    const tms = teamData || [];
    if (tms.length < 2) {
      setLoadingId(null);
      return;
    }

    const isPower = (n: number) => (n & (n - 1)) === 0 && n !== 0;
    let schedule: { matches: { round: number; teamA: number; teamB: number }[] } & {
      debug?: string[];
    } = { matches: [] };
    let debugInfo: string[] = [];

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
      }
      debugInfo = json.debug || [];
      if (!res.ok) {
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

    setLoadingId(null);
    setDebug(debugInfo);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Tournament Setup</h2>
        <div className="space-y-2">
          <input
            className="border p-1"
            placeholder="Tournament name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Select Teams</h3>
          <div className="space-x-2">
            {teams.map((t) => (
              <label key={t.id} className="space-x-1">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={(e) => toggleTeam(t.id, e.target.checked)}
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          className="border border-green-500 bg-green-500 hover:bg-green-600 text-white px-2"
          onClick={createTournament}
          disabled={!name || selected.length === 0}
        >
          AI schedule
        </button>
        {debug.length > 0 && (
          <pre className="border p-2 text-sm whitespace-pre-wrap">{debug.join("\n")}</pre>
        )}
      </div>
      <TournamentsView
        tournaments={tournaments}
        onRun={(id) => router.push(`/run/${id}`)}
        onView={(id) => router.push(`/tournaments/${id}`)}
        onDelete={deleteTournament}
      />
    </div>
  );
}
