"use client";
import { useState } from "react";

interface Match {
  id: number;
  teamA: string;
  teamB: string;
  winner?: string;
}

export default function RunPage() {
  const [matches, setMatches] = useState<Match[]>([
    { id: 1, teamA: "Team 1", teamB: "Team 2" },
    { id: 2, teamA: "Team 3", teamB: "Team 4" },
  ]);

  const setWinner = (id: number, winner: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, winner } : m))
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournament Run</h2>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="space-x-2">
            <span>
              {m.teamA} vs {m.teamB}
            </span>
            {!m.winner ? (
              <>
                <button className="border px-2" onClick={() => setWinner(m.id, m.teamA)}>
                  {m.teamA} wins
                </button>
                <button className="border px-2" onClick={() => setWinner(m.id, m.teamB)}>
                  {m.teamB} wins
                </button>
              </>
            ) : (
              <span className="text-green-600">Winner: {m.winner}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
