"use client";
import { useState } from "react";

type Player = {
  id: number;
  name: string;
  offense: number;
  defense: number;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [offense, setOffense] = useState(0);
  const [defense, setDefense] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);

  const resetForm = () => {
    setName("");
    setOffense(0);
    setDefense(0);
    setEditing(null);
  };

  const addOrUpdate = () => {
    if (editing !== null) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === editing ? { ...p, name, offense, defense } : p
        )
      );
    } else {
      const id = players.length ? players[players.length - 1].id + 1 : 1;
      setPlayers([...players, { id, name, offense, defense }]);
    }
    resetForm();
  };

  const edit = (p: Player) => {
    setName(p.name);
    setOffense(p.offense);
    setDefense(p.defense);
    setEditing(p.id);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Players</h2>
      <div className="space-y-2">
        <input
          className="border p-1"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          className="border p-1"
          placeholder="Offense"
          value={offense}
          onChange={(e) => setOffense(Number(e.target.value))}
        />
        <input
          type="number"
          className="border p-1"
          placeholder="Defense"
          value={defense}
          onChange={(e) => setDefense(Number(e.target.value))}
        />
        <button className="border px-2" onClick={addOrUpdate}>
          {editing ? "Update" : "Add"}
        </button>
        {editing && (
          <button className="border px-2" onClick={resetForm}>
            Cancel
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {players.map((p) => (
          <li key={p.id} className="flex gap-2 items-center">
            <span>{p.name}</span>
            <span className="text-sm text-gray-500">
              O:{p.offense} D:{p.defense}
            </span>
            <button className="text-blue-600" onClick={() => edit(p)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
