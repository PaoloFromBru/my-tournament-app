'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
        setLoadError(tournamentError?.message || 'Tournament not found.');
        return;
      }

      setTournament(t as Tournament);

      const { data: teamData, error: teamsError } = await supabasePublic
        .from('tournament_teams')
        .select('team_id, teams(id, name)')
        .eq('tournament_id', id);

      if (teamsError) {
        setLoadError(teamsError.message);
        return;
      }

      setTeams(
        (teamData || []).map((tt: any) => ({
          id: tt.team_id,
          name: tt.teams?.name ?? '',
        }))
      );

      const { data: matchData, error: matchesError } = await supabasePublic
        .from('matches')
        .select('id, tournament_id, team_a, team_b, phase, scheduled_at, winner, score_a, score_b')
        .eq('tournament_id', id)
        .order('id', { ascending: true });

      if (matchesError) {
        setLoadError(matchesError.message);
        return;
      }

      setMatches(matchData || []);
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

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="mb-2 text-gray-600">
        {ended ? 'Tournament ended' : 'Tournament in progress'}
      </p>
      {winnerName && (
        <p className="mb-4 font-semibold">Winner: {winnerName}</p>
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
