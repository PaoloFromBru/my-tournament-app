"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button } from "./ui/button";
import { useDonationOverlay } from "@/hooks/useDonationOverlay";
import DonationModal from "./DonationModal";

export default function PlayersView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sportId, setSportId] = useState<string | null>(null);
  const [sportName, setSportName] = useState<string>("");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any | null>(null);

  const { showOverlay, dismissTemporarily } = useDonationOverlay(
    userProfile,
    players.length
  );


  const sortPlayers = (list: any[]) =>
    list.slice().sort((a, b) => a.name.localeCompare(b.name));

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

  // 2. Get user profile
  useEffect(() => {
    if (!userId) return;

    const getProfile = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("sport_id, paying_status, donation_date")
        .eq("user_id", userId)
        .single();
      if (data) {
        if (data.sport_id) setSportId(data.sport_id as string);
        setUserProfile(data);
      }
    };

    getProfile();
  }, [userId]);

  // 3. Load sport info (skills and name)
  useEffect(() => {
    if (!sportId) return;

    const getSportInfo = async () => {
      const { data } = await supabase
        .from("sports")
        .select("skills, display_name")
        .eq("id", sportId)
        .single();
      if (data?.skills) {
        const uniqueSkills = Array.from(
          new Set((data.skills as string[]).filter(Boolean))
        );
        setSkillsList(uniqueSkills);
      }
      if (data?.display_name) setSportName(data.display_name as string);
    };

    getSportInfo();
  }, [sportId]);

  // 4. Load all players and their profile for current sport
  useEffect(() => {
    if (!userId || !sportId) return;

    const loadPlayers = async () => {
      const { data } = await supabase
        .from("player_profiles")
        .select("id, skills, players(id, name)")
        .eq("sport_id", sportId)
        .eq("players.user_id", userId)
        .order("name", { foreignTable: "players" });

      const playersWithProfiles = (data || [])
        .filter((row: any) => row.players)
        .map((row: any) => ({
          id: row.players.id,
          name: row.players.name,
          profile_id: row.id,
          skills: row.skills || {},
        }));

      setPlayers(sortPlayers(playersWithProfiles));
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

    setPlayers((prev) =>
      sortPlayers([
        ...prev,
        {
          ...newPlayer,
          profile_id: newProfile.id,
          skills: {},
        },
      ])
    );

    setNewPlayerName("");
  };

  const handleDeletePlayer = async (id: string) => {
    await supabase.from("player_profiles").delete().eq("player_id", id);
    await supabase.from("players").delete().eq("id", id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <p className="p-4">Loading players...</p>;

  return (
    <>
      {showOverlay && (
        <DonationModal
          onClose={dismissTemporarily}
          stripeLink="https://buy.stripe.com/3cIfZie5z8KwcAq9xDak000"
        />
      )}
      <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4 flex items-baseline gap-2">
        Players
        {sportName && (
          <span className="text-sm text-gray-500 font-normal">
            {sportName} ({players.length})
          </span>
        )}
      </h1>

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

      <div className="mb-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter players"
          className="w-full border p-2 rounded"
        />
      </div>

      {players
        .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
        .map((player) => (
          <div
            key={player.id}
            className="mb-4 bg-slate-50 border border-gray-200 rounded-xl px-5 py-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold">{player.name}</h2>
              <Button
                variant="destructive"
                onClick={() => handleDeletePlayer(player.id)}
              >
                Delete
              </Button>
            </div>
            {skillsList.map((skill) => (
              <div key={skill} className="mt-2 flex items-center">
                <label className="w-32">{skill}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
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
    </>
  );
}
