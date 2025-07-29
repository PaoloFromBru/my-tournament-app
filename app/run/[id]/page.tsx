"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";

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
    const phaseNums = matches.map((m) => parseInt(m.phase.replace(/\D/g, "")) || 0);
    const currentRound = Math.max(...phaseNums, 1);
    const currentMatches = matches.filter(
      (m) => parseInt(m.phase.replace(/\D/g, "")) === currentRound
    );
    const winners = currentMatches.map((m) => m.winner).filter((w): w is number => Boolean(w));
    if (winners.length !== currentMatches.length) return;

    if (winners.length === 1) {
      triggerConfetti();
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
          user_id: user?.id ?? null,
        }))
      );
      let roundQuery = supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id);
      roundQuery = user
        ? roundQuery.eq("user_id", user.id)
        : roundQuery.is("user_id", null);
      const { data: newMatches } = await roundQuery;
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
    const knockoutCount = (total: number) => {
      let count = 2;
      while (total > count * 2 + 1) {
        count *= 2;
      }
      return count;
    };

    const count = Math.min(knockoutCount(teams.length), rankings.length);
    const topIds = rankings.slice(0, count).map((r) => Number(r.id));
    const pairings: { team_a: number; team_b: number }[] = [];
    for (let i = 0; i < topIds.length / 2; i++) {
      pairings.push({
        team_a: topIds[i],
        team_b: topIds[topIds.length - 1 - i],
      });
    }
    if (pairings.length === 0) return;
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
    if (
      finalMatches.length === 1 &&
      finalMatches[0].winner &&
      finalMatches[0].phase.startsWith('round')
    ) {
      triggerConfetti();
      setCelebrated(true);
    }
  }, [matches, celebrated]);

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
