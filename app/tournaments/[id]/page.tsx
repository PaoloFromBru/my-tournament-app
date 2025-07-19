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

export default function TournamentViewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();
      setTournament(t);

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", id);
      setTeams(teamData || []);

      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id);
      setMatches(matchData || []);
    };
    load();
  }, [id]);

  const teamName = (tid: number | null | undefined) =>
    tid === null || tid === undefined
      ? "BYE"
      : teams.find((t) => t.id === tid)?.name || "Unknown team";

  const phases = Array.from(new Set(matches.map((m) => m.phase))).sort(
    (a, b) =>
      (parseInt(a.replace(/\D/g, "")) || 0) -
      (parseInt(b.replace(/\D/g, "")) || 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-xl font-bold">
          {tournament?.name || "Tournament"}
        </h2>
      </div>
      {debug.length > 0 && (
        <details className="text-sm border p-2 rounded">
          <summary className="cursor-pointer">Debug info</summary>
          <pre className="whitespace-pre-wrap">{debug.join("\n")}</pre>
        </details>
      )}
      {matches.length === 0 ? (
        <p>Results and details will appear here.</p>
      ) : (
        <div className="flex space-x-4 overflow-x-auto">
          {phases.map((phase) => (
            <div key={phase} className="min-w-[220px]">
              <h3 className="text-center mb-2 font-semibold capitalize">
                {phase}
              </h3>
              <div className="flex flex-col space-y-4">
                {matches
                  .filter((m) => m.phase === phase)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="bg-blue-100 text-black dark:bg-blue-900 dark:text-white p-2 rounded shadow"
                    >
                      <div className="flex justify-between">
                        <span>{teamName(m.team_a)}</span>
                        <span className="font-semibold">{m.score_a ?? 0}</span>
                      </div>
                      <div className="flex justify-between mt-1">
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
      )}
    </div>
  );
}
