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

  useEffect(() => {
    supabase.from('tournaments').select('*').then(({ data }) => {
      setTournaments(data || []);
    });
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournaments</h2>
      <ul className="list-disc pl-5 space-y-1">
        {tournaments.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className="flex-1">{t.name}</span>
            <Link href="/run" className="border px-2 py-0.5">Run</Link>
            <Link href={`/tournaments/${t.id}`} className="border px-2 py-0.5">
              View
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
