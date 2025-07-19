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
    if (offense < 0 || offense > 10 || defense < 0 || defense > 10) {
      alert('Skills must be between 0 and 10');
      return;
    }
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
    if (
      skillOffense < 0 ||
      skillOffense > 10 ||
      skillDefense < 0 ||
      skillDefense > 10
    ) {
      alert('Skills must be between 0 and 10');
      return;
    }
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
    if (!confirm('Delete this player and all associated teams?')) return;

    const { data: tpRows } = await supabase
      .from('team_players')
      .select('team_id')
      .eq('player_id', id)
      .eq('user_id', user.id);
    const teamIds = (tpRows || []).map((tp) => tp.team_id);

    for (const teamId of teamIds) {
      await supabase
        .from('team_players')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user.id);

      await supabase
        .from('matches')
        .update({ team_a: null })
        .eq('team_a', teamId)
        .eq('user_id', user.id);

      await supabase
        .from('matches')
        .update({ team_b: null })
        .eq('team_b', teamId)
        .eq('user_id', user.id);

      await supabase
        .from('matches')
        .update({ winner: null })
        .eq('winner', teamId)
        .eq('user_id', user.id);

      await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
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
          Enter the player's Offence and Defence levels below (0-10).
        </p>
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
        <button
          className="mt-2 border border-green-500 bg-green-500 hover:bg-green-600 text-white px-2"
          onClick={addOrUpdate}
        >
          {editing ? "Update" : "Add"}
        </button>
        {editing && (
          <button className="mt-2 border bg-gray-200 px-2" onClick={resetForm}>
            Cancel
          </button>
        )}
      </div>
      <ul className="space-y-1 bg-gray-100 p-2 rounded">
        {players.map((p) => (
          <li key={p.id} className="border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="flex-1">
                {p.name}{" "}
                <span className="text-sm text-gray-500">O:{p.offense} D:{p.defense}</span>
              </span>
              <button
                className="border border-blue-500 bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5"
                onClick={() => edit(p)}
              >
                Edit
              </button>
              <button
                className="border border-yellow-500 bg-yellow-500 hover:bg-yellow-600 text-black px-2 py-0.5"
                onClick={() => editSkills(p)}
              >
                Change skills
              </button>
              <button
                className="border border-orange-500 bg-orange-500 hover:bg-orange-600 text-white px-2 py-0.5"
                onClick={() => deletePlayer(p.id)}
              >
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
                <button
                  className="border border-yellow-500 bg-yellow-500 hover:bg-yellow-600 text-black px-2"
                  onClick={() => updateSkills(p.id)}
                >
                  Save
                </button>
                <button className="border bg-gray-200 px-2" onClick={() => setSkillEditing(null)}>
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
