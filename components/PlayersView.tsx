import { Button } from "@/components/ui/button";

export interface Player {
  id: number;
  name: string;
  offense: number;
  defense: number;
}

interface Props {
  players: Player[];
  onAdd: React.FormEventHandler<HTMLFormElement>;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onChangeSkills: (id: number) => void;
}

export default function PlayersView({ players, onAdd, onEdit, onDelete, onChangeSkills }: Props) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Players</h2>
      </div>

      {/* Add New Player */}
      <form
        onSubmit={onAdd}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <input
            name="name"
            type="text"
            placeholder="Player name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            name="offense"
            type="number"
            placeholder="Offense (0-10)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min={0}
            max={10}
          />
          <input
            name="defense"
            type="number"
            placeholder="Defense (0-10)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min={0}
            max={10}
          />
        </div>
        <Button type="submit" className="mt-2">Add Player</Button>
      </form>

      {/* Player List */}
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-gray-200 rounded-xl px-4 py-3"
          >
            <div className="text-sm">
              <div className="font-medium">{player.name}</div>
              <div className="text-gray-500">O:{player.offense} D:{player.defense}</div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => onEdit(player.id)}>Edit</Button>
              <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => onChangeSkills(player.id)}>Change Skills</Button>
              <Button variant="destructive" onClick={() => onDelete(player.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
