"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabasePublic } from "../../../../lib/supabasePublic";

interface Match {
  id: string | number;
  team_a: string | number | null;
  team_b: string | number | null;
  phase: string;
  scheduled_at: string | null;
  winner?: string | number | null;
  score_a?: number | null;
  score_b?: number | null;
}

interface Team {
  id: string | number;
  name: string;
}

export default function TournamentRunPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [celebrated, setCelebrated] = useState(false);
  // ensures initial match generation only happens once
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const load = async () => {
      const { data: t } = await supabasePublic
        .from("tournaments")
        .select("id, name")
        .eq("id", id)
        .single();
      setTournament(t);

      const { data: matchData } = await supabasePublic
        .from("matches")
        .select("id, tournament_id, team_a, team_b, phase, scheduled_at, winner, score_a, score_b")
        .eq("tournament_id", id);

      const { data: ttData } = await supabasePublic
        .from("tournament_teams")
        .select("team_id")
        .eq("tournament_id", id);
      let teamIds = (ttData || []).map((tt: any) => tt.team_id);
      let teamsConverted: Team[] = [];
      if (teamIds.length) {
        const { data: teamData } = await supabasePublic
          .from("teams")
          .select("id, name")
          .in("id", teamIds);
        teamsConverted = teamData || [];
      } else {
        const { data: teamData } = await supabasePublic
          .from("teams")
          .select("id, name")
          .eq("tournament_id", id);
        teamsConverted = teamData || [];
        teamIds = teamsConverted.map((t) => t.id);
      }

      setMatches(matchData || []);
      setTeams(teamsConverted);
    };
    load();
  }, [id]);

  const teamName = (tid: string | number | null | undefined) =>
    tid === null || tid === undefined
      ? "BYE"
      : teams.find((t) => String(t.id) === String(tid))?.name || "Unknown team";

  const triggerConfetti = () => {
    const container = document.createElement("div");
    container.className = "confetti-container";
    for (let i = 0; i < 100; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = `${Math.random() * 100}%`;
      el.style.backgroundColor = `hsl(${Math.random() * 360},100%,50%)`;
      el.style.animationDelay = `${Math.random() * 0.5}s`;
      container.appendChild(el);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 5000);
  };

  const phases = Array.from(new Set(matches.map((m) => m.phase))).sort(
    (a, b) =>
      (parseInt(a.replace(/\D/g, "")) || 0) -
      (parseInt(b.replace(/\D/g, "")) || 0)
  );

  useEffect(() => {
    if (celebrated) return;
    const phaseNumsLocal = matches
      .filter((m) => m.phase.startsWith('round'))
      .map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
    const maxRound = Math.max(...phaseNumsLocal, 1);
    const finalMatches = matches.filter(
      (m) =>
        m.phase.startsWith('round') &&
        (parseInt(m.phase.replace(/\D/g, "")) || 0) === maxRound
    );
    if (finalMatches.length === 1 && finalMatches[0].winner) {
      triggerConfetti();
      setCelebrated(true);
    }
  }, [matches, celebrated]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{tournament?.name || "Tournament"} Run</h2>
      <div className="flex space-x-4 overflow-x-auto">
        {phases.map((phase) => (
          <div key={phase} className="min-w-[220px]">
            <h3 className="text-center mb-2 font-semibold capitalize">{phase}</h3>
            <div className="flex flex-col space-y-4">
              {matches
                .filter((m) => m.phase === phase)
                .map((m) => (
                  <div
                    key={m.id}
                    className="bg-blue-100 text-black dark:bg-blue-900 dark:text-white p-2 rounded shadow"
                  >
                    <div className="flex justify-between items-center">
                      <span>{teamName(m.team_a)}</span>
                      <span className="font-semibold">{m.score_a ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>{teamName(m.team_b)}</span>
                      <span className="font-semibold">{m.score_b ?? 0}</span>
                    </div>
                    {m.winner && (
                      <p className="text-center mt-1 text-green-700 dark:text-green-300 font-medium">
                        Winner: {teamName(m.winner)}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
