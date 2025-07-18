"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseBrowser";

interface Tournament {
  id: number;
  name: string;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .eq('user_id', userData.user.id);
        setTournaments(data || []);
      } else {
        setTournaments([]);
      }
    };
    load();
  }, []);

  const deleteTournament = async (id: number) => {
    if (!user) return;
    if (!confirm('Delete this tournament?')) return;
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', id)
      .eq('user_id', user.id);
    await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournaments</h2>
      <ul className="list-disc pl-5 space-y-1">
        {tournaments.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className="flex-1">{t.name}</span>
            <Link href={`/run/${t.id}`} className="border px-2 py-0.5">Run</Link>
            <Link href={`/tournaments/${t.id}`} className="border px-2 py-0.5">
              View
            </Link>
            <button
              className="border px-2 py-0.5"
              onClick={() => deleteTournament(t.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
