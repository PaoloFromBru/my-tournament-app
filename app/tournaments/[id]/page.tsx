"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseBrowser";
import {
  generateRoundRobinMatches,
  generateKnockoutMatches,
} from "../../../utils/scheduleMatches";

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
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);

  const groupedMatches = matches.reduce((acc, match) => {
    const key = match.phase || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  async function generateSchedule() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const teamRes = await supabase
      .from('tournament_teams')
      .select('team_id')
      .eq('tournament_id', id);
    const teamIds = teamRes.data?.map((t) => t.team_id) || [];
    const { format } = tournament || {};
    const rawMatches =
      format === 'round_robin'
        ? generateRoundRobinMatches(teamIds)
        : generateKnockoutMatches(teamIds);
    const toInsert = rawMatches.map((m) => ({
      tournament_id: id,
      team_a: m.team_a,
      team_b: m.team_b || null,
      phase: m.phase,
      user_id: user?.id ?? null,
      sport_id: tournament?.sport_id,
    }));
    if (toInsert.length) {
      await supabase.from('matches').insert(toInsert);
      location.reload();
    }
  }

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();
      setTournament(t);

      const { data: teamData } = await supabase
        .from("tournament_teams")
        .select("team_id, teams(id, name)")
        .eq("tournament_id", id);
      setTeams(
        (teamData || []).map((tt: any) => ({
          id: tt.team_id,
          name: tt.teams?.name ?? "",
        }))
      );

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

  const phases = Object.keys(groupedMatches);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{tournament?.name || "Tournament"}</h2>
          <p className="text-sm text-gray-500">Format: {tournament?.format}</p>
        </div>
        <button
          onClick={() => {
            setDebug((d) => [...d, `Share button clicked for ${id}`]);
            console.debug('Share button clicked for', id);
            router.push(`/tournaments/${id}/public`);
          }}
          className="px-3 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Share
        </button>
      </div>
      {debug.length > 0 && (
        <details className="text-sm border p-2 rounded">
          <summary className="cursor-pointer">Debug info</summary>
          <pre className="whitespace-pre-wrap">{debug.join("\n")}</pre>
        </details>
      )}
      {matches.length === 0 ? (
        <div>
          <p>Results and details will appear here.</p>
          <button
            onClick={generateSchedule}
            className="px-4 py-2 mt-2 bg-blue-600 text-white rounded"
          >
            Generate Schedule
          </button>
        </div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto">
          {phases.map((phase) => (
            <div key={phase} className="min-w-[220px]">
              <h3 className="text-center mb-2 font-semibold capitalize">
                {phase}
              </h3>
              <div className="flex flex-col space-y-4">
                {groupedMatches[phase]?.map((m) => (
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
