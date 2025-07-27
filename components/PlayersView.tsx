"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

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

  if (loading) return <p className="p-4">Loading players...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Players</h1>
      {players.map((player) => (
        <div key={player.id} className="mb-6 border-b pb-4">
          <h2 className="text-lg font-semibold">{player.name}</h2>
          {skills.map((skill) => (
            <div key={skill} className="mt-2 flex items-center">
              <label className="w-32">{skill}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={player.skills?.[skill] || 0}
                onChange={(e) =>
                  updateSkill(player.id, skill, parseInt(e.target.value))
                }
                className="w-full"
              />
              <span className="ml-2">{player.skills?.[skill] || 0}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
