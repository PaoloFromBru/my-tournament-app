import { Button } from "@/components/ui/button";

interface Team {
  id: number;
  name: string;
}

interface Tournament {
  id: number;
  name: string;
  teams: { id: number }[];
}

interface Props {
  tournaments: Tournament[];
  teams: Team[];
  onSchedule: React.FormEventHandler<HTMLFormElement>;
  onCreate: React.MouseEventHandler<HTMLButtonElement>;
  onRun: (id: number) => void;
  onView: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TournamentsView({
  tournaments,
  teams,
  onSchedule,
  onCreate,
  onRun,
  onView,
  onDelete,
}: Props) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Tournament Setup */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-xl font-semibold">Tournament Setup</h2>

        <form onSubmit={onSchedule} className="space-y-4">
          <input
            type="text"
            name="tournamentName"
            placeholder="Tournament name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
          />

          <div>
            <label className="block font-medium mb-1 text-sm">Select Teams</label>
            <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto">
              {teams.map((team) => (
                <label key={team.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="teamSelection"
                    value={team.id}
                    className="text-emerald-600 rounded"
                  />
                  {team.name}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
            AI Schedule
          </Button>
        </form>
      </section>

      {/* Tournaments List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tournaments</h2>
          <Button variant="outline" onClick={onCreate}>Create New Tournament</Button>
        </div>

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
