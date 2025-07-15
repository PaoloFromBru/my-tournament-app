"use client";
import { useEffect, useState } from "react";
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
      <ul className="list-disc pl-5">
        {tournaments.map(t => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    </div>
  );
}
