'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseBrowser';
import QRCode from '@/components/QRCode';

interface Team {
  id: number;
  name: string;
}

interface Match {
  id: number;
  team_a: number | null;
  team_b: number | null;
  score_a: number | null;
  score_b: number | null;
  winner: number | null;
  phase: string;
}

export default function PublicTournamentView() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Always share the canonical public URL for the tournament
    const url = `${window.location.origin}/tournaments/${id}/public`;
    setShareUrl(url);
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      const { data: t } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      setTournament(t);

      const { data: teamData } = await supabase
        .from('tournament_teams')
        .select('team_id, teams(id, name)')
        .eq('tournament_id', id);
      setTeams(
        (teamData || []).map((tt: any) => ({
          id: tt.team_id,
          name: tt.teams?.name ?? ''
        }))
      );

      // Order by id so that matches appear in consistent order without
      // relying on a non-existent created_at column
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', id)
        .order('id', { ascending: true });
      setMatches(matchData || []);
   };

    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
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
            return [...prev, newMatch].sort((a, b) => a.id - b.id);
          });
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (!tournament) return <div className="p-4">Loading...</div>;

  const teamName = (tid: number | null) =>
    tid === null ? 'BYE' : teams.find((t) => t.id === tid)?.name || 'Unknown';

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
      <p className="mb-4 text-gray-600">Tournament in progress</p>

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
          console.debug('Public share invoked', shareUrl);
          navigator.share?.({
            title: tournament.name,
            url: shareUrl,
            text: 'Follow the tournament live!'
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
