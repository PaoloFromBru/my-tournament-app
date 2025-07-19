import { Button } from "@/components/ui/button";

export interface Player {
  id: number;
  name: string;
  offense: number;
  defense: number;
}

export interface Team {
  id: number;
  name: string;
  playerIds: number[];
}

interface Props {
  teams: Team[];
  players: Player[];
  onAdd: React.FormEventHandler<HTMLFormElement>;
  onEdit: (team: Team) => void;
  onDelete: (id: number) => void;
  onGenerateBalanced: () => void;
}

function teamOffense(ids: number[], players: Player[]) {
  const values = ids.map((pid) => players.find((p) => p.id === pid)?.offense ?? 0);
  return Math.max(...values);
}

function teamDefense(ids: number[], players: Player[]) {
  const values = ids.map((pid) => players.find((p) => p.id === pid)?.defense ?? 0);
  return Math.max(...values);
}

export default function TeamsView({
  teams,
  players,
  onAdd,
  onEdit,
  onDelete,
  onGenerateBalanced,
}: Props) {
  const playerName = (id: number) => players.find((p) => p.id === id)?.name || "";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Teams</h2>
        <Button variant="outline" onClick={onGenerateBalanced}>
          Balanced Teams
        </Button>
      </div>

      {/* Add New Team */}
      <form
        onSubmit={onAdd}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            name="teamName"
            type="text"
            placeholder="Team name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />

          {/* Player checkboxes */}
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {players.map((player) => (
              <label key={player.id} className="text-sm flex items-center gap-1">
                <input
                  type="checkbox"
                  name="members"
                  value={player.id}
                  className="rounded text-emerald-600"
                />
                {player.name}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="mt-2">
          Add Team
        </Button>
      </form>

      {/* Team List */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-gray-200 rounded-xl px-4 py-3"
          >
            <div className="text-sm">
              <div className="font-medium">{team.name}</div>
              <div className="text-gray-500">
                {team.playerIds.map(playerName).join(" & ")}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                O:{teamOffense(team.playerIds, players)} D:{teamDefense(team.playerIds, players)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => onEdit(team)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => onDelete(team.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
