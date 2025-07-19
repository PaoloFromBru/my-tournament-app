"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";

interface Match {
  id: number;
  team_a: number;
  team_b: number;
  phase: string;
  scheduled_at: string | null;
  winner?: number | null;
  score_a?: number | null;
  score_b?: number | null;
}

interface Team {
  id: number;
  name: string;
}

export default function TournamentRunPage() {
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Record<number, { a: number; b: number }>>({});
  const [celebrated, setCelebrated] = useState(false);
  // ensures initial match generation only happens once
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUser(currentUser);

      if (currentUser) {
        const { data: t } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .eq("user_id", currentUser.id)
          .single();
        setTournament(t);

        let { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", id)
          .eq("user_id", currentUser.id);

        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("user_id", currentUser.id)
          .eq("tournament_id", id);

        if (!matchData || matchData.length === 0) {
          const pairs: { team_a: number; team_b: number }[] = [];
          for (let i = 0; i < (teamData || []).length; i += 2) {
            if (teamData && teamData[i + 1]) {
              pairs.push({
                team_a: teamData[i].id,
                team_b: teamData[i + 1].id,
              });
            }
          }
          if (pairs.length) {
            await supabase.from("matches").insert(
              pairs.map((p) => ({
                ...p,
                phase: "round1",
                scheduled_at: null,
                tournament_id: id,
                user_id: currentUser.id,
              }))
            );
            const { data: newMatches } = await supabase
              .from("matches")
              .select("*")
              .eq("tournament_id", id)
              .eq("user_id", currentUser.id);
            matchData = newMatches || [];
          } else {
            matchData = [];
          }
        }

        setMatches(matchData || []);
        setTeams(teamData || []);

        const initial: Record<number, { a: number; b: number }> = {};
        (matchData || []).forEach((m) => {
          initial[m.id] = { a: m.score_a || 0, b: m.score_b || 0 };
        });
        setScores(initial);
      }
    };
    load();
  }, [id]);

  const teamName = (tid: number | null | undefined) =>
    tid === null || tid === undefined
      ? "BYE"
      : teams.find((t) => t.id === tid)?.name || "Unknown team";

  const triggerFireworks = () => {
    const container = document.createElement("div");
    container.className = "fireworks-container";
    for (let i = 0; i < 20; i++) {
      const el = document.createElement("div");
      el.className = "firework";
      el.style.left = `${50}%`;
      el.style.top = `${50}%`;
      el.style.setProperty("--x", `${(Math.random() - 0.5) * 400}px`);
      el.style.setProperty("--y", `${(Math.random() - 0.5) * 400}px`);
      el.style.color = `hsl(${Math.random() * 360},100%,50%)`;
      container.appendChild(el);
    }
    document.body.appendChild(container);
    // keep the fireworks visible for a little longer so users can enjoy them
    setTimeout(() => container.remove(), 3000);
  };

  const nextRound = async () => {
    if (!user) return;
    const phaseNums = matches.map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
    const currentRound = Math.max(...phaseNums, 1);
    const currentMatches = matches.filter(
      (m) => parseInt(m.phase.replace(/\D/g, "")) === currentRound
    );
    const winners = currentMatches.map((m) => m.winner).filter((w): w is number => Boolean(w));
    if (winners.length !== currentMatches.length) return;

    if (winners.length === 1) {
      triggerFireworks();
      return;
    }

    const byeCounts: Record<number, number> = {};
    matches.forEach((m) => {
      if ((m.team_a && !m.team_b) || (m.team_b && !m.team_a)) {
        const id = (m.team_a || m.team_b) as number;
        byeCounts[id] = (byeCounts[id] || 0) + 1;
      }
    });

    const pairings: { team_a: number; team_b: number | null; winner?: number }[] = [];
    const ordered = [...winners];

    if (ordered.length % 2 === 1) {
      let byeTeam = ordered[0];
      for (const id of ordered) {
        const count = byeCounts[id] || 0;
        if (count < (byeCounts[byeTeam] || 0)) {
          byeTeam = id;
        }
      }
      ordered.splice(ordered.indexOf(byeTeam), 1);
      pairings.push({ team_a: byeTeam, team_b: null, winner: byeTeam });
    }

    for (let i = 0; i < ordered.length; i += 2) {
      if (ordered[i + 1] !== undefined) {
        pairings.push({ team_a: ordered[i], team_b: ordered[i + 1] });
      }
    }

    const nextRoundNum = currentRound + 1;
    if (pairings.length) {
      await supabase.from("matches").insert(
        pairings.map((p) => ({
          team_a: p.team_a,
          team_b: p.team_b,
          winner: p.winner,
          phase: `round${nextRoundNum}`,
          scheduled_at: null,
          tournament_id: id,
          user_id: user.id,
        }))
      );
      const { data: newMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id)
        .eq("user_id", user.id);
      setMatches(newMatches || []);

      const initial = { ...scores };
      (newMatches || []).forEach((m) => {
        if (!initial[m.id]) {
          initial[m.id] = { a: m.score_a || 0, b: m.score_b || 0 };
        }
      });
      setScores(initial);
    }
  };

  const saveResult = async (m: Match) => {
    if (!user) return;
    const sc = scores[m.id] || { a: 0, b: 0 };
    const winner = sc.a === sc.b ? null : sc.a > sc.b ? m.team_a : m.team_b;
    await supabase
      .from("matches")
      .update({ winner, score_a: sc.a, score_b: sc.b })
      .eq("id", m.id)
      .eq("user_id", user.id);
    setMatches((prev) =>
      prev.map((mt) =>
        mt.id === m.id ? { ...mt, winner, score_a: sc.a, score_b: sc.b } : mt
      )
    );
  };

  const phases = Array.from(new Set(matches.map((m) => m.phase))).sort(
    (a, b) =>
      (parseInt(a.replace(/\D/g, "")) || 0) -
      (parseInt(b.replace(/\D/g, "")) || 0)
  );

  const phaseNums = matches.map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
  const currentRound = Math.max(...phaseNums, 1);
  const currentMatches = matches.filter(
    (m) => parseInt(m.phase.replace(/\D/g, "")) === currentRound
  );
  const allDone = currentMatches.length > 0 && currentMatches.every((m) => m.winner);
  const hasNext = matches.some(
    (m) => parseInt(m.phase.replace(/\D/g, "")) === currentRound + 1
  );
  const canAdvance = allDone && !hasNext && currentMatches.length > 1;

  useEffect(() => {
    if (celebrated) return;
    const phaseNumsLocal = matches.map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
    const maxRound = Math.max(...phaseNumsLocal, 1);
    const finalMatches = matches.filter(
      (m) => parseInt(m.phase.replace(/\D/g, "")) === maxRound
    );
    if (finalMatches.length === 1 && finalMatches[0].winner) {
      triggerFireworks();
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
                      <input
                        type="number"
                        className="w-12 border"
                        value={scores[m.id]?.a ?? 0}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            [m.id]: {
                              a: Number(e.target.value),
                              b: scores[m.id]?.b ?? 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>{teamName(m.team_b)}</span>
                      <input
                        type="number"
                        className="w-12 border"
                        value={scores[m.id]?.b ?? 0}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            [m.id]: {
                              a: scores[m.id]?.a ?? 0,
                              b: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <button
                      className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white py-0.5 rounded"
                      onClick={() => saveResult(m)}
                    >
                      Save Result
                    </button>
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
      {canAdvance && (
        <button className="border bg-gray-200 px-2" onClick={nextRound}>
          Next Round
        </button>
      )}
    </div>
  );
}
