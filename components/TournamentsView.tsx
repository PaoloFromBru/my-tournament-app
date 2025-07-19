import { Button } from "@/components/ui/button";

interface Tournament {
  id: number;
  name: string;
  teams: { id: number }[];
}

interface Props {
  tournaments: Tournament[];
  onRun: (id: number) => void;
  onView: (id: number) => void;
  onSchedule: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TournamentsView({ tournaments, onRun, onView, onSchedule, onDelete }: Props) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Tournaments</h2>
        <Button variant="outline" className="text-sm">
          Create New Tournament
        </Button>
      </div>

      {/* Tournament List */}
      <div className="space-y-4">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-gray-200 rounded-xl shadow-sm p-4"
          >
            <div>
              <h3 className="text-lg font-medium">{tournament.name}</h3>
              <p className="text-sm text-gray-500">{tournament.teams.length} teams</p>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
              <Button className="bg-red-500 hover:bg-red-600" onClick={() => onRun(tournament.id)}>Run</Button>
              <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => onView(tournament.id)}>View</Button>
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => onSchedule(tournament.id)}>AI Schedule</Button>
              <Button variant="destructive" onClick={() => onDelete(tournament.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
