"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";
import { generateNextRoundMatches } from "../../../utils/scheduleMatches";
import { logDebug } from "../../../utils/logger";

interface Match {
  id: string | number;
  team_a: string | number;
  team_b: string | number;
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

const knockoutRoundNumber = (phase: string) => {
  if (!phase.toLowerCase().startsWith("round")) return null;
  return parseInt(phase.replace(/\D/g, ""), 10) || 0;
};

const hasWinner = (match: Match) =>
  match.winner !== null && match.winner !== undefined && match.winner !== "";

const isRoundRobinTournament = (format?: string) => {
  const normalized = format?.toLowerCase() || "";
  return normalized === "round_robin" || normalized.includes("italian");
};

const expectedFinalRound = (teamCount: number, format?: string) => {
  if (teamCount < 2) return 0;

  if (isRoundRobinTournament(format)) {
    let knockoutTeams = 2;
    const maxTeams = Math.min(teamCount, 8);
    while (knockoutTeams * 2 <= maxTeams) {
      knockoutTeams *= 2;
    }
    return Math.ceil(Math.log2(knockoutTeams));
  }

  return Math.ceil(Math.log2(teamCount));
};

const getTournamentWinner = (
  matches: Match[],
  teams: Team[],
  format?: string
) => {
  if (matches.length === 0 || teams.length < 2) return null;

  if (isRoundRobinTournament(format)) {
    const rrMatches = matches.filter((m) => knockoutRoundNumber(m.phase) === null);
    const expectedRoundRobinMatches = (teams.length * (teams.length - 1)) / 2;
    const roundRobinComplete =
      expectedRoundRobinMatches > 0 &&
      rrMatches.length >= expectedRoundRobinMatches &&
      rrMatches.every(hasWinner);

    if (!roundRobinComplete) return null;
  }

  const knockoutMatches = matches.filter((m) => knockoutRoundNumber(m.phase) !== null);
  if (knockoutMatches.length === 0) return null;

  const maxRound = Math.max(
    ...knockoutMatches.map((m) => knockoutRoundNumber(m.phase) ?? 0)
  );
  if (maxRound < expectedFinalRound(teams.length, format)) return null;

  const finals = knockoutMatches.filter((m) => knockoutRoundNumber(m.phase) === maxRound);
  if (finals.length !== 1 || !hasWinner(finals[0])) return null;

  const priorRoundsComplete = knockoutMatches.every((m) => {
    const roundNumber = knockoutRoundNumber(m.phase) ?? 0;
    return roundNumber >= maxRound || hasWinner(m);
  });

  return priorRoundsComplete ? String(finals[0].winner) : null;
};

const getTournamentDiagnostics = (
  matches: Match[],
  teams: Team[],
  format?: string
) => {
  const rrMatches = matches.filter((m) => knockoutRoundNumber(m.phase) === null);
  const knockoutMatches = matches.filter((m) => knockoutRoundNumber(m.phase) !== null);
  const expectedRoundRobinMatches = (teams.length * (teams.length - 1)) / 2;
  const roundRobinComplete =
    expectedRoundRobinMatches > 0 &&
    rrMatches.length >= expectedRoundRobinMatches &&
    rrMatches.every(hasWinner);
  const knockoutRounds = knockoutMatches.map((m) => knockoutRoundNumber(m.phase) ?? 0);
  const maxKnockoutRound = knockoutRounds.length ? Math.max(...knockoutRounds) : 0;
  const expectedKnockoutFinalRound = expectedFinalRound(teams.length, format);
  const finals = knockoutMatches.filter(
    (m) => knockoutRoundNumber(m.phase) === maxKnockoutRound
  );

  return {
    format,
    isRoundRobin: isRoundRobinTournament(format),
    teamCount: teams.length,
    matchCount: matches.length,
    roundRobin: {
      count: rrMatches.length,
      expected: expectedRoundRobinMatches,
      complete: roundRobinComplete,
      withoutWinner: rrMatches
        .filter((m) => !hasWinner(m))
        .map((m) => ({ id: m.id, phase: m.phase })),
    },
    knockout: {
      count: knockoutMatches.length,
      maxRound: maxKnockoutRound,
      expectedFinalRound: expectedKnockoutFinalRound,
      finals: finals.map((m) => ({
        id: m.id,
        phase: m.phase,
        winner: m.winner,
        hasWinner: hasWinner(m),
      })),
      withoutWinner: knockoutMatches
        .filter((m) => !hasWinner(m))
        .map((m) => ({ id: m.id, phase: m.phase })),
    },
  };
};

export default function TournamentRunPage() {
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Record<string, { a: number; b: number }>>({});
  const [celebrated, setCelebrated] = useState(false);
  const [readyForKnockout, setReadyForKnockout] = useState(false);
  // ensures initial match generation only happens once
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUser(currentUser);

      const tournamentQuery = supabase
        .from("tournaments")
        .select("*")
        .eq("id", id);
      if (currentUser) tournamentQuery.eq("user_id", currentUser.id);
      const { data: t } = await tournamentQuery.single();
      setTournament(t);
      console.info("[tournament-run] loaded tournament", {
        id,
        format: t?.format,
        ended: t?.ended,
        winner_id: t?.winner_id,
        user_id: t?.user_id,
      });

      let matchQuery = supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id);
      if (currentUser) matchQuery = matchQuery.eq("user_id", currentUser.id);
      let { data: matchData } = await matchQuery;

      const teamQuery = supabase
        .from("tournament_teams")
        .select("team_id, teams(id, name, user_id)")
        .eq("tournament_id", id);
      if (currentUser) teamQuery.eq("teams.user_id", currentUser.id);
      const { data: teamData } = await teamQuery;

      const teamsConverted = (teamData || []).map((tt: any) => ({
        id: tt.team_id,
        name: tt.teams?.name ?? "",
      }));

      if (!matchData || matchData.length === 0) {
        const pairs: { team_a: number; team_b: number }[] = [];
        for (let i = 0; i < teamsConverted.length; i += 2) {
          if (teamsConverted[i + 1]) {
            pairs.push({
              team_a: teamsConverted[i].id,
              team_b: teamsConverted[i + 1].id,
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
              user_id: currentUser?.id ?? null,
            }))
          );
          let newMatchQuery = supabase
            .from("matches")
            .select("*")
            .eq("tournament_id", id);
          newMatchQuery = currentUser
            ? newMatchQuery.eq("user_id", currentUser.id)
            : newMatchQuery.is("user_id", null);
          const { data: newMatches } = await newMatchQuery;
          matchData = newMatches || [];
        } else {
          matchData = [];
        }
      }

      setMatches(matchData || []);
      setTeams(teamsConverted);
      console.info("[tournament-run] loaded matches/teams", {
        tournamentId: id,
        teamCount: teamsConverted.length,
        matchCount: (matchData || []).length,
        phases: Array.from(new Set((matchData || []).map((m: Match) => m.phase))),
      });

      const initial: Record<string, { a: number; b: number }> = {};
      (matchData || []).forEach((m) => {
        initial[String(m.id)] = { a: m.score_a || 0, b: m.score_b || 0 };
      });
      setScores(initial);
    };
    load();
  }, [id]);

  const teamName = (tid: string | number | null | undefined) =>
    tid === null || tid === undefined
      ? "BYE"
      : teams.find((t) => String(t.id) === String(tid))?.name || "Unknown team";

  const rankings = useMemo(() => {
    const rrMatches = matches.filter((m) => !m.phase.startsWith('round'));
    const stats: Record<string, { wins: number; diff: number }> = {};
    teams.forEach((t) => {
      stats[String(t.id)] = { wins: 0, diff: 0 };
    });
    rrMatches.forEach((m) => {
      if (m.winner !== null && m.winner !== undefined) {
        stats[String(m.winner)].wins += 1;
      }
      if (m.score_a != null && m.score_b != null) {
        stats[String(m.team_a)].diff += (m.score_a ?? 0) - (m.score_b ?? 0);
        stats[String(m.team_b)].diff += (m.score_b ?? 0) - (m.score_a ?? 0);
      }
    });
    return teams
      .map((t) => ({
        id: t.id,
        name: t.name,
        wins: stats[String(t.id)].wins,
        diff: stats[String(t.id)].diff,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.diff - a.diff;
      });
  }, [matches, teams]);

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

  const nextRound = async () => {
    const koMatches = matches.filter((m) => m.phase.startsWith("round"));
    if (koMatches.length === 0) return;

    const phaseNums = koMatches.map((m) => parseInt(m.phase.replace(/\D/g, "")) || 1);
    const currentRound = Math.max(...phaseNums);
    const currentMatches = koMatches.filter(
      (m) => parseInt(m.phase.replace(/\D/g, "")) === currentRound
    );
    const winners = currentMatches
      .map((m) => m.winner)
      .filter((w): w is number => Boolean(w));
    logDebug('nextRound winners', winners);
    if (winners.length !== currentMatches.length) return;

    if (winners.length === 1) {
      triggerConfetti();
      return;
    }

    const pairings = generateNextRoundMatches(winners);
    logDebug('nextRound pairings', pairings);
    const nextRoundNum = currentRound + 1;
    if (pairings.length) {
      await supabase.from("matches").insert(
        pairings.map((p) => ({
          team_a: p.team_a,
          team_b: p.team_b,
          winner: p.winner ?? null,
          phase: `round${nextRoundNum}`,
          scheduled_at: null,
          tournament_id: id,
          user_id: user?.id ?? null,
        }))
      );
      logDebug('nextRound inserted', pairings)
      const { data: newMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id);
      setMatches(newMatches || []);

      const initial = { ...scores };
      (newMatches || []).forEach((m) => {
        if (!initial[String(m.id)]) {
          initial[String(m.id)] = { a: m.score_a || 0, b: m.score_b || 0 };
        }
      });
      setScores(initial);
    }
  };

  const generateKnockout = async () => {
    console.info("[tournament-run] generateKnockout start", {
      tournamentId: id,
      rankings,
      currentTournament: {
        ended: tournament?.ended,
        winner_id: tournament?.winner_id,
      },
    });
    // Reset the ended flag so the public page shows "in progress" again
    // until the new knockout final is decided.
    await supabase
      .from('tournaments')
      .update({ ended: false, winner_id: null })
      .eq('id', id);
    setCelebrated(false);

    const knockoutCount = (total: number) => {
      let count = 2;
      while (count * 2 <= total && count < 8) {
        count *= 2;
      }
      return count;
    };

    const count = Math.min(knockoutCount(teams.length), rankings.length);
    const topIds = rankings.slice(0, count).map((r) => r.id);
    const pairings: { team_a: string | number; team_b: string | number }[] = [];
    for (let i = 0; i < topIds.length / 2; i++) {
      pairings.push({
        team_a: topIds[i],
        team_b: topIds[topIds.length - 1 - i],
      });
    }
    logDebug('generateKnockout pairings', pairings)
    if (pairings.length === 0) return;
    console.info("[tournament-run] generateKnockout inserting", {
      tournamentId: id,
      pairings,
    });
    await supabase.from("matches").insert(
      pairings.map((p) => ({
        team_a: p.team_a,
        team_b: p.team_b,
        phase: "round1",
        scheduled_at: null,
        tournament_id: id,
        user_id: user?.id ?? null,
      }))
    );
    logDebug('generateKnockout inserted', pairings)
    const { data: newMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id);
    setMatches(newMatches || []);
    setReadyForKnockout(false);
  };

  const saveResult = async (m: Match) => {
    const sc = scores[String(m.id)] || { a: 0, b: 0 };
    const winner = sc.a === sc.b ? null : sc.a > sc.b ? m.team_a : m.team_b;
    console.info("[tournament-run] saveResult", {
      tournamentId: id,
      matchId: m.id,
      phase: m.phase,
      score: sc,
      winner,
    });
    let updateQuery = supabase
      .from("matches")
      .update({ winner, score_a: sc.a, score_b: sc.b })
      .eq("id", m.id);
    updateQuery = user
      ? updateQuery.eq("user_id", user.id)
      : updateQuery.is("user_id", null);
    await updateQuery;
    setMatches((prev) =>
      prev.map((mt) =>
        mt.id === m.id ? { ...mt, winner, score_a: sc.a, score_b: sc.b } : mt
      )
    );
  };

  const updateScore = async (
    m: Match,
    field: "a" | "b",
    value: number
  ) => {
    const current = scores[String(m.id)] || { a: m.score_a || 0, b: m.score_b || 0 };
    const updated = {
      ...current,
      [field]: value,
    } as { a: number; b: number };
    setScores((prev) => ({
      ...prev,
      [String(m.id)]: updated,
    }));

    let scoreQuery = supabase
      .from("matches")
      .update({
        score_a: updated.a,
        score_b: updated.b,
      })
      .eq("id", m.id);
    scoreQuery = user
      ? scoreQuery.eq("user_id", user.id)
      : scoreQuery.is("user_id", null);
    await scoreQuery;
    setMatches((prev) =>
      prev.map((mt) =>
        mt.id === m.id
          ? { ...mt, score_a: updated.a, score_b: updated.b }
          : mt
      )
    );
  };

  const phases = Array.from(new Set(matches.map((m) => m.phase))).sort(
    (a, b) =>
      (parseInt(a.replace(/\D/g, "")) || 0) -
      (parseInt(b.replace(/\D/g, "")) || 0)
  );
  const rrPhases = phases.filter((p) => !p.startsWith('round'));
  const koPhases = phases.filter((p) => p.startsWith('round'));

  const koPhaseNums = matches
    .filter((m) => m.phase.startsWith('round'))
    .map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
  const currentRound = koPhaseNums.length ? Math.max(...koPhaseNums) : 0;
  const currentMatches = matches.filter(
    (m) =>
      m.phase.startsWith('round') &&
      (parseInt(m.phase.replace(/\D/g, "")) || 0) === currentRound
  );
  const allDone = currentMatches.length > 0 && currentMatches.every((m) => m.winner);
  const hasNext = matches.some(
    (m) =>
      m.phase.startsWith('round') &&
      (parseInt(m.phase.replace(/\D/g, "")) || 0) === currentRound + 1
  );
  const canAdvance = allDone && !hasNext && currentMatches.length > 1;

  useEffect(() => {
    // Wait until tournament is loaded so we can check the ended flag
    if (!tournament) return;

    const winner = getTournamentWinner(matches, teams, tournament.format);
    const diagnostics = getTournamentDiagnostics(matches, teams, tournament.format);
    console.info("[tournament-run] completion check", {
      tournamentId: id,
      stored: {
        ended: tournament.ended,
        winner_id: tournament.winner_id,
      },
      computedWinner: winner,
      diagnostics,
    });

    if (!winner) {
      if (tournament.ended || tournament.winner_id) {
        console.warn("[tournament-run] clearing stale tournament winner", {
          tournamentId: id,
          stored: {
            ended: tournament.ended,
            winner_id: tournament.winner_id,
          },
          diagnostics,
        });
        supabase
          .from("tournaments")
          .update({ ended: false, winner_id: null })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Failed to clear tournament winner", error.message);
          });
        setTournament((prev: any) =>
          prev ? { ...prev, ended: false, winner_id: null } : prev
        );
      }
      setCelebrated(false);
      return;
    }

    if (tournament.ended && tournament.winner_id === winner) {
      if (!celebrated) setCelebrated(true);
      return;
    }

    if (!celebrated) {
      triggerConfetti();
    }
    console.warn("[tournament-run] setting tournament winner", {
      tournamentId: id,
      winner,
      diagnostics,
    });
    setCelebrated(true);
    supabase
      .from("tournaments")
      .update({ ended: true, winner_id: winner })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to set tournament winner", error.message);
      });
    setTournament((prev: any) =>
      prev ? { ...prev, ended: true, winner_id: winner } : prev
    );
  }, [matches, teams, tournament, celebrated, id]);

  useEffect(() => {
    if (!tournament || tournament.format !== 'round_robin') return;
    if (matches.length === 0) return;
    const rrMatches = matches.filter((m) => !m.phase.startsWith('round'));
    const knockoutExists = matches.some((m) => m.phase.startsWith('round'));
    if (knockoutExists) {
      setReadyForKnockout(false);
      return;
    }
    if (rrMatches.length === 0) return;
    const allDone = rrMatches.every((m) => m.winner);
    setReadyForKnockout(allDone);
  }, [matches, tournament]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{tournament?.name || "Tournament"} Run</h2>
      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 overflow-x-auto">
        <div className="flex space-x-4">
          {rrPhases.map((phase) => (
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
                          value={scores[String(m.id)]?.a ?? 0}
                          onChange={(e) =>
                            updateScore(
                              m,
                              "a",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>{teamName(m.team_b)}</span>
                        <input
                          type="number"
                          className="w-12 border"
                          value={scores[String(m.id)]?.b ?? 0}
                          onChange={(e) =>
                            updateScore(
                              m,
                              "b",
                              Number(e.target.value)
                            )
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
        {koPhases.length > 0 && (
          <div className="flex space-x-4 md:ml-4 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-4">
            {koPhases.map((phase) => (
              <div key={phase} className="min-w-[220px]">
                <h3 className="text-center mb-2 font-semibold capitalize">{phase}</h3>
                <div className="flex flex-col space-y-4">
                  {matches
                    .filter((m) => m.phase === phase)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="bg-red-100 text-black dark:bg-red-900 dark:text-white p-2 rounded shadow"
                      >
                        <div className="flex justify-between items-center">
                          <span>{teamName(m.team_a)}</span>
                          <input
                            type="number"
                            className="w-12 border"
                            value={scores[String(m.id)]?.a ?? 0}
                            onChange={(e) =>
                              updateScore(
                                m,
                                "a",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span>{teamName(m.team_b)}</span>
                          <input
                            type="number"
                            className="w-12 border"
                            value={scores[String(m.id)]?.b ?? 0}
                            onChange={(e) =>
                              updateScore(
                                m,
                                "b",
                                Number(e.target.value)
                              )
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
        )}
      </div>
      {readyForKnockout && (
        <div className="space-y-2">
          <div className="border p-2 rounded">
            <h3 className="font-semibold mb-1">Ranking</h3>
            <ol className="list-decimal pl-4 space-y-1">
              {rankings.map((r) => (
                <li key={r.id}>
                  {r.name} (W: {r.wins}, Diff: {r.diff})
                </li>
              ))}
            </ol>
          </div>
          <Button
            className="bg-purple-500 hover:bg-purple-600"
            onClick={generateKnockout}
          >
            Next Phase
          </Button>
        </div>
      )}
      {canAdvance && (
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={nextRound}>
          Next Round
        </Button>
      )}
    </div>
  );
}
