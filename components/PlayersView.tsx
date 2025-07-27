"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";

export default function PlayersView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Step 2: Fetch sport_id from user_profiles
  useEffect(() => {
    if (!userId) return;

    const loadSportSkills = async () => {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("sport_id")
        .eq("user_id", userId)
        .single();

      if (!profile?.sport_id) return;

      // Step 3: Get skills for the sport
      const { data: sport } = await supabase
        .from("sports")
        .select("skills")
        .eq("id", profile.sport_id)
        .single();

      if (sport?.skills) setSkills(sport.skills as string[]);
    };

    loadSportSkills();
  }, [userId]);

  // Step 4: Fetch players
  useEffect(() => {
    const loadPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name, skills")
        .order("name");

      setPlayers((data || []) as any[]);
      setLoading(false);
    };
    loadPlayers();
  }, []);

  // Step 5: Update player skill
  const updateSkill = async (
    playerId: number,
    skillKey: string,
    value: number,
  ) => {
    const player = players.find((p) => p.id === playerId);
    const updatedSkills = { ...(player?.skills || {}), [skillKey]: value };

    await supabase
      .from("players")
      .update({ skills: updatedSkills })
      .eq("id", playerId);

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, skills: updatedSkills } : p,
      ),
    );
  };

  const deletePlayer = async (playerId: number) => {
    if (!confirm("Delete this player and all associated teams?")) return;

    const { data: tpRows } = await supabase
      .from("team_players")
      .select("team_id")
      .eq("player_id", playerId);

    const teamIds = (tpRows || []).map((tp) => tp.team_id);

    for (const teamId of teamIds) {
      await supabase
        .from("team_players")
        .delete()
        .eq("team_id", teamId);

      await supabase
        .from("matches")
        .update({ team_a: null })
        .eq("team_a", teamId);

      await supabase
        .from("matches")
        .update({ team_b: null })
        .eq("team_b", teamId);

      await supabase
        .from("matches")
        .update({ winner: null })
        .eq("winner", teamId);

      await supabase.from("teams").delete().eq("id", teamId);
    }

    await supabase.from("players").delete().eq("id", playerId);

    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  if (loading) return <p className="p-4">Loading players...</p>;

  return (
    <div className="relative max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Players</h1>
      {players.map((player) => (
        <section
          key={player.id}
          className="bg-slate-50 border border-gray-200 rounded-xl shadow-sm p-4 space-y-3"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">{player.name}</h2>
            <Button variant="destructive" onClick={() => deletePlayer(player.id)}>
              Delete
            </Button>
          </div>
          {skills.map((skill) => {
            const value = Math.max(player.skills?.[skill] ?? 1, 1);
            return (
              <div key={skill} className="flex items-center gap-2">
                <label className="w-32 text-sm">{skill}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={value}
                  onChange={(e) =>
                    updateSkill(player.id, skill, parseInt(e.target.value))
                  }
                  className="flex-grow"
                />
                <span className="w-6 text-center">{value}</span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
