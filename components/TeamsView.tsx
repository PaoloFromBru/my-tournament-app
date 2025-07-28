"use client";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import SelectableTagGroup from "./SelectableTagGroup";

export interface Player {
  id: string;
  name: string;
  skills: Record<string, number>;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

interface Props {
  teams: Team[];
  players: Player[];
  teamSize: number;
  onAdd: (name: string, memberIds: string[]) => void | Promise<void>;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  onSetTeams: (teams: Team[]) => void;
  onDeleteAll: () => void;
  loading?: boolean;
}

function averageSkill(player: Player): number {
  const values = Object.values(player.skills || {});
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function teamScore(ids: string[], players: Player[]): number {
  const values = ids.map((id) => averageSkill(players.find((p) => p.id === id)!));
  return Math.round(values.reduce((a, b) => a + b, 0));
}

export default function TeamsView({
  teams,
  players,
  teamSize,
  onAdd,
  onEdit,
  onDelete,
  onSetTeams,
  onDeleteAll,
  loading,
}: Props) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedPlayers.length !== teamSize) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem("teamName") as HTMLInputElement).value;
    onAdd(name, selectedPlayers);
    setSelectedPlayers([]);
    form.reset();
  };

  const playerName = (id: string) => players.find((p) => p.id === id)?.name || "";

  const generateBalancedTeams = () => {
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const teams: Team[] = [];
    let teamId = 0;
    while (shuffled.length >= teamSize) {
      const group = shuffled.splice(0, teamSize);
      teams.push({
        id: `ai-${teamId++}`,
        name: `Team ${teamId}`,
        playerIds: group.map((p) => p.id),
      });
    }
    onSetTeams(teams);
  };

  return (
    <div className="relative max-w-3xl mx-auto p-6 space-y-6">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <img src="/babyfoot.svg" alt="loading" className="w-20 h-20 animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Teams</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateBalancedTeams}>
            AI balanced teams
          </Button>
          <Button variant="destructive" onClick={onDeleteAll}>
            Delete all
          </Button>
        </div>
      </div>

      {/* Add New Team */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            name="teamName"
            type="text"
            placeholder="Team name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />

          <SelectableTagGroup
            items={players}
            selectedIds={selectedPlayers}
            onToggle={togglePlayer}
            label={`Select ${teamSize} Players`}
            getLabel={(p) => p.name}
            maxHeight="max-h-32"
          />
        </div>

        <Button type="submit" className="mt-2" disabled={selectedPlayers.length !== teamSize}>
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
                Team Score: {teamScore(team.playerIds, players)}
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
