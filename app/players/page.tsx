"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";

type Player = {
  id: number;
  name: string;
  offense: number;
  defense: number;
  user_id: string;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [offense, setOffense] = useState(0);
  const [defense, setDefense] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [skillEditing, setSkillEditing] = useState<number | null>(null);
  const [skillOffense, setSkillOffense] = useState(0);
  const [skillDefense, setSkillDefense] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', userData.user.id);
        setPlayers(data || []);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setOffense(0);
    setDefense(0);
    setEditing(null);
  };

  const addOrUpdate = async () => {
    if (!user) return;
    if (editing !== null) {
      await supabase
        .from('players')
        .update({ name, offense, defense })
        .eq('id', editing)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('players')
        .insert({ name, offense, defense, user_id: user.id });
    }
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id);
    setPlayers(data || []);
    resetForm();
  };

  const edit = (p: Player) => {
    setName(p.name);
    setOffense(p.offense);
    setDefense(p.defense);
    setEditing(p.id);
  };

  const editSkills = (p: Player) => {
    setSkillOffense(p.offense);
    setSkillDefense(p.defense);
    setSkillEditing(p.id);
  };

  const updateSkills = async (id: number) => {
    if (!user) return;
    await supabase
      .from('players')
      .update({ offense: skillOffense, defense: skillDefense })
      .eq('id', id)
      .eq('user_id', user.id);
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id);
    setPlayers(data || []);
    setSkillEditing(null);
  };

  const deletePlayer = async (id: number) => {
    if (!user) return;
    if (!confirm('Delete this player?')) return;

    let { data: unknown } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'Unknown player')
      .single();

    if (!unknown) {
      const { data: inserted } = await supabase
        .from('players')
        .insert({
          name: 'Unknown player',
          offense: 0,
          defense: 0,
          user_id: user.id,
        })
        .select()
        .single();
      unknown = inserted || undefined;
    }

    if (unknown) {
      await supabase
        .from('team_players')
        .update({ player_id: unknown.id })
        .eq('player_id', id)
        .eq('user_id', user.id);
    }

    await supabase
      .from('players')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    setPlayers((prev) => prev.filter((p) => p.id !== id));
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
        <p className="text-sm text-gray-600">
          Set the player's skill levels using the sliders below. The first
          slider controls the Offence skill, the second controls the Defence
          skill.
        </p>
        <input
          type="range"
          min="0"
          max="10"
          className="w-full"
          value={offense}
          onChange={(e) => setOffense(Number(e.target.value))}
        />
        <input
          type="range"
          min="0"
          max="10"
          className="w-full"
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
          <li key={p.id} className="border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="flex-1">
                {p.name}{" "}
                <span className="text-sm text-gray-500">O:{p.offense} D:{p.defense}</span>
              </span>
              <button className="border px-2 py-0.5" onClick={() => edit(p)}>
                Edit
              </button>
              <button className="border px-2 py-0.5" onClick={() => editSkills(p)}>
                Change skills
              </button>
              <button className="border px-2 py-0.5" onClick={() => deletePlayer(p.id)}>
                Delete
              </button>
            </div>
            {skillEditing === p.id && (
              <div className="flex gap-2 mt-1 items-center">
                <input
                  type="number"
                  className="border p-1 w-20"
                  value={skillOffense}
                  onChange={(e) => setSkillOffense(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="border p-1 w-20"
                  value={skillDefense}
                  onChange={(e) => setSkillDefense(Number(e.target.value))}
                />
                <button className="border px-2" onClick={() => updateSkills(p.id)}>
                  Save
                </button>
                <button className="border px-2" onClick={() => setSkillEditing(null)}>
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
