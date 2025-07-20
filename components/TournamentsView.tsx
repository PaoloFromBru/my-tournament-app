"use client";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import SelectableTagGroup from "./SelectableTagGroup";

interface Team {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
  teams: { id: string }[];
}

interface Props {
  tournaments: Tournament[];
  teams: Team[];
  onSchedule: (name: string, teamIds: string[]) => void | Promise<void>;
  onRun: (id: string) => void;
  onView: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export default function TournamentsView({
  tournaments,
  teams,
  onSchedule,
  onRun,
  onView,
  onShare,
  onDelete,
  loading,
}: Props) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const toggleTeam = (id: string) => {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("tournamentName") as HTMLInputElement).value;
    onSchedule(name, selectedTeams);
    setSelectedTeams([]);
    form.reset();
  };
  return (
    <div className="relative max-w-3xl mx-auto p-6 space-y-8">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <img src="/babyfoot.svg" alt="loading" className="w-20 h-20 animate-spin" />
        </div>
      )}
      {/* Tournament Setup */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-xl font-semibold">Tournament Setup</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="tournamentName"
            placeholder="Tournament name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
          />

          <SelectableTagGroup
            label="Select Teams"
            items={teams}
            selectedIds={selectedTeams}
            onToggle={toggleTeam}
            getLabel={(t) => t.name}
            maxHeight="max-h-32"
          />

          <Button type="submit" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
            AI Schedule
          </Button>
        </form>
      </section>

      {/* Tournaments List */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tournaments</h2>

        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="bg-slate-50 border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center"
          >
            <div className="text-sm space-y-1">
              <div className="text-base font-medium">{tournament.name}</div>
              <div className="text-gray-500">{tournament.teams.length} teams</div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
              <Button className="bg-red-500 hover:bg-red-600" onClick={() => onRun(tournament.id)}>
                Run
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onView(tournament.id)}>
                View
              </Button>
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => onShare(tournament.id)}>
                Share
              </Button>
              <Button variant="destructive" onClick={() => onDelete(tournament.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
