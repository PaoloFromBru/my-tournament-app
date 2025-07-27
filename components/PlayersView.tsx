"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export default function PlayersView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sportId, setSportId] = useState<string | null>(null);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState<string>("");

  // 1. Load current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // 2. Get sport from user_profiles
  useEffect(() => {
    if (!userId) return;

    const getSport = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("sport_id")
        .eq("user_id", userId)
        .single();
      if (data?.sport_id) setSportId(data.sport_id as string);
    };

    getSport();
  }, [userId]);

  // 3. Load sport skill list
  useEffect(() => {
    if (!sportId) return;

    const getSkills = async () => {
      const { data } = await supabase
        .from("sports")
        .select("skills")
        .eq("id", sportId)
        .single();
      if (data?.skills) setSkillsList(data.skills as string[]);
    };

    getSkills();
  }, [sportId]);

  // 4. Load all players and their profile for current sport
  useEffect(() => {
    if (!userId || !sportId) return;

    const loadPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, name")
        .eq("user_id", userId)
        .order("name");

      const playersWithProfiles = await Promise.all(
        (data || []).map(async (player: any) => {
          const { data: profile } = await supabase
            .from("player_profiles")
            .select("id, skills")
            .eq("player_id", player.id)
            .eq("sport_id", sportId)
            .single();

          return {
            ...player,
            profile_id: profile?.id || null,
            skills: profile?.skills || {},
          };
        })
      );

      setPlayers(playersWithProfiles);
      setLoading(false);
    };

    loadPlayers();
  }, [userId, sportId]);

  // 5. Handle skill update
  const updateSkill = async (
    playerId: string,
    profileId: string | null,
    skill: string,
    value: number
  ) => {
    const updatedPlayers = players.map((p) =>
      p.id === playerId
        ? {
            ...p,
            skills: {
              ...p.skills,
              [skill]: value,
            },
          }
        : p
    );
    setPlayers(updatedPlayers);

    if (profileId) {
      await supabase
        .from("player_profiles")
        .update({ skills: updatedPlayers.find((p) => p.id === playerId).skills })
        .eq("id", profileId);
    } else {
      const { data, error } = await supabase
        .from("player_profiles")
        .insert({
          player_id: playerId,
          sport_id: sportId,
          skills: { [skill]: value },
        })
        .select()
        .single();

      if (!error && data) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === playerId ? { ...p, profile_id: data.id, skills: data.skills } : p
          )
        );
      }
    }
  };

  // 6. Add a new player (with blank profile)
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !userId) return;

    const { data: newPlayer, error: playerError } = await supabase
      .from("players")
      .insert({ name: newPlayerName.trim(), user_id: userId })
      .select()
      .single();

    if (playerError || !newPlayer) return;

    const { data: newProfile, error: profileError } = await supabase
      .from("player_profiles")
      .insert({
        player_id: newPlayer.id,
        sport_id: sportId,
        skills: {},
      })
      .select()
      .single();

    if (profileError || !newProfile) return;

    setPlayers((prev) => [
      ...prev,
      {
        ...newPlayer,
        profile_id: newProfile.id,
        skills: {},
      },
    ]);

    setNewPlayerName("");
  };

  if (loading) return <p className="p-4">Loading players...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Players</h1>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="New player name"
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={handleAddPlayer}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Add
        </button>
      </div>

      {players.map((player) => (
        <div key={player.id} className="mb-6 border-b pb-4">
          <h2 className="text-lg font-semibold">{player.name}</h2>
          {skillsList.map((skill) => (
            <div key={skill} className="mt-2 flex items-center">
              <label className="w-32">{skill}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={player.skills?.[skill] || 0}
                onChange={(e) =>
                  updateSkill(
                    player.id,
                    player.profile_id,
                    skill,
                    parseInt(e.target.value)
                  )
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
