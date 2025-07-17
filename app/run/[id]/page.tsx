"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
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

        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", id)
          .eq("user_id", currentUser.id);
        setMatches(matchData || []);

        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("user_id", currentUser.id);
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
    teams.find((t) => t.id === tid)?.name || `Team ${tid}`;

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

  const createSchedule = (list: Match[]) =>
    list
      .slice()
      .sort((a, b) => {
        const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return at - bt;
      });

  const scheduledMatches = createSchedule(matches);

  const phases = Array.from(new Set(matches.map((m) => m.phase)));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{tournament?.name || "Tournament"} Run</h2>
      <div>
        <h3 className="font-semibold">Scheduled Games</h3>
        <ul className="list-disc pl-5 space-y-1">
          {scheduledMatches.map((m) => (
            <li key={m.id}>
              {teamName(m.team_a)} vs {teamName(m.team_b)}
              {m.scheduled_at && (
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(m.scheduled_at).toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
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
    </div>
  );
}
