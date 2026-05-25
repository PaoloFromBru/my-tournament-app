'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabasePublic } from '@/lib/supabasePublic';
import QRCode from '@/components/QRCode';

interface Team {
  id: string | number;
  name: string;
}

interface Match {
  id: string | number;
  team_a: string | number | null;
  team_b: string | number | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | number | null;
  phase: string;
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  sport: string | null;
  sport_id: string | null;
  ended: boolean | null;
  winner_id: string | null;
}

export default function PublicTournamentView() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const showDebug = searchParams.get('debug') === '1';
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/tournaments/${id}/public`;
    setShareUrl(url);
  }, [id]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);

      const { data: t, error: tournamentError } = await supabasePublic
        .from('tournaments')
        .select('id, name, format, sport, sport_id, ended, winner_id')
        .eq('id', id)
        .single();

      if (tournamentError || !t) {
        console.error('[public-tournament] tournament load failed', {
          tournamentId: id,
          error: tournamentError,
        });
        setLoadError(tournamentError?.message || 'Tournament not found.');
        return;
      }

      setTournament(t as Tournament);
      console.info('[public-tournament] loaded tournament', {
        tournamentId: id,
        tournament: t,
      });

      const { data: teamData, error: teamsError } = await supabasePublic
        .from('tournament_teams')
        .select('team_id, teams(id, name)')
        .eq('tournament_id', id);

      if (teamsError) {
        console.error('[public-tournament] teams load failed', {
          tournamentId: id,
          error: teamsError,
        });
        setLoadError(teamsError.message);
        return;
      }

      setTeams(
        (teamData || []).map((tt: any) => ({
          id: tt.team_id,
          name: tt.teams?.name ?? '',
        }))
      );
      console.info('[public-tournament] loaded teams', {
        tournamentId: id,
        teamCount: teamData?.length || 0,
        teams: teamData,
      });

      const { data: matchData, error: matchesError } = await supabasePublic
        .from('matches')
        .select('id, tournament_id, team_a, team_b, phase, scheduled_at, winner, score_a, score_b')
        .eq('tournament_id', id)
        .order('id', { ascending: true });

      if (matchesError) {
        console.error('[public-tournament] matches load failed', {
          tournamentId: id,
          error: matchesError,
        });
        setLoadError(matchesError.message);
        return;
      }

      setMatches(matchData || []);
      console.info('[public-tournament] loaded matches', {
        tournamentId: id,
        matchCount: matchData?.length || 0,
        phases: Array.from(new Set((matchData || []).map((m: Match) => m.phase))),
        matches: matchData,
      });
    };

    if (id) loadData();
  }, [id]);

  // Realtime: match updates
  useEffect(() => {
    if (!id) return;
    const channel = supabasePublic
      .channel(`public-view-matches-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${id}`,
        },
        (payload) => {
          const newMatch = payload.new as Match;
          console.info('[public-tournament] realtime match update', {
            tournamentId: id,
            eventType: payload.eventType,
            match: newMatch,
          });
          setMatches((prev) => {
            const idx = prev.findIndex((m) => m.id === newMatch.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = newMatch;
              return updated;
            }
            return [...prev, newMatch].sort((a, b) =>
              String(a.id).localeCompare(String(b.id))
            );
          });
        }
      );
    channel.subscribe();
    return () => {
      supabasePublic.removeChannel(channel);
    };
  }, [id]);

  // Realtime: tournament ended flag
  useEffect(() => {
    if (!id) return;
    const channel = supabasePublic
      .channel(`public-view-tournament-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as Tournament;
          console.warn('[public-tournament] realtime tournament update', {
            tournamentId: id,
            eventType: payload.eventType,
            tournament: updated,
          });
          setTournament((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      );
    channel.subscribe();
    return () => {
      supabasePublic.removeChannel(channel);
    };
  }, [id]);

  if (loadError) return <div className="p-4 text-red-600">{loadError}</div>;
  if (!tournament) return <div className="p-4">Loading...</div>;

  const teamName = (tid: string | number | null) =>
    tid === null
      ? 'BYE'
      : teams.find((t) => String(t.id) === String(tid))?.name || 'Unknown';

  const ended = tournament.ended === true;
  const winnerName = ended && tournament.winner_id ? teamName(tournament.winner_id) : null;
  const debugState = {
    tournamentId: id,
    ended,
    winner_id: tournament.winner_id,
    winnerName,
    format: tournament.format,
    teamCount: teams.length,
    matchCount: matches.length,
    phases: Array.from(new Set(matches.map((m) => m.phase))),
    matchesWithWinners: matches
      .filter((m) => m.winner !== null && m.winner !== undefined && m.winner !== '')
      .map((m) => ({ id: m.id, phase: m.phase, winner: m.winner })),
  };

  console.info('[public-tournament] render status', debugState);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="mb-2 text-gray-600">
        {ended ? 'Tournament ended' : 'Tournament in progress'}
      </p>
      {winnerName && (
        <p className="mb-4 font-semibold">Winner: {winnerName}</p>
      )}

      {showDebug && (
        <pre className="mb-4 overflow-auto rounded border bg-slate-50 p-3 text-xs text-slate-700">
          {JSON.stringify(debugState, null, 2)}
        </pre>
      )}

      <h2 className="text-xl font-semibold mt-6">Teams</h2>
      <ul className="list-disc list-inside">
        {teams.map((team) => (
          <li key={team.id}>{team.name}</li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mt-6">Matches</h2>
      <ul className="mt-2">
        {matches.map((match, index) => (
          <li key={match.id} className="border-b py-2">
            Match {index + 1}: {teamName(match.team_a)} vs {teamName(match.team_b)} —{' '}
            <strong>
              {match.score_a !== null && match.score_b !== null
                ? `${match.score_a} - ${match.score_b}`
                : 'TBD'}
            </strong>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          navigator.share?.({
            title: tournament.name,
            url: shareUrl,
            text: 'Follow the tournament live!',
          });
        }}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Share with Participants
      </button>

      <div className="mt-6 flex justify-center">
        <QRCode value={shareUrl} />
      </div>
    </div>
  );
}
