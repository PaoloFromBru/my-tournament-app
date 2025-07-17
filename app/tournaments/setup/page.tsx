"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseBrowser";

interface Team {
  id: number;
  name: string;
}

export default function TournamentSetupPage() {
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [maxDuration, setMaxDuration] = useState("15 minutes");
  const [format, setFormat] = useState("direct elimination");

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("user_id", userData.user.id);
        setTeams(teamsData || []);
      }
    };
    load();
  }, []);

  const toggleTeam = (id: number, checked: boolean) => {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((tid) => tid !== id)
    );
  };

  const createTournament = async () => {
    if (!user || !name || selected.length === 0) return;
    const { data: inserted } = await supabase
      .from("tournaments")
      .insert({
        name,
        max_duration: maxDuration,
        format,
        user_id: user.id,
      })
      .select()
      .single();

    if (inserted?.id) {
      await supabase
        .from("teams")
        .update({ tournament_id: inserted.id })
        .in("id", selected)
        .eq("user_id", user.id);
    }

    setName("");
    setSelected([]);
    setMaxDuration("15 minutes");
    setFormat("direct elimination");
    alert("Tournament created");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Tournament Setup</h2>
      <div className="space-y-2">
        <input
          className="border p-1"
          placeholder="Tournament name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Select Teams</h3>
        <div className="space-x-2">
          {teams.map((t) => (
            <label key={t.id} className="space-x-1">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={(e) => toggleTeam(t.id, e.target.checked)}
              />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="block">
          <span className="mr-2">Max duration:</span>
          <select
            className="border p-1"
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
          >
            <option value="15 minutes">15 minutes</option>
            <option value="30 minutes">30 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="2 hours">2 hours</option>
          </select>
        </label>
      </div>
      <div className="space-y-2">
        <label className="block">
          <span className="mr-2">Format:</span>
          <select
            className="border p-1"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="direct elimination">direct elimination</option>
            <option value="Italian tournament">Italian tournament</option>
            <option value="mixed">mixed</option>
          </select>
        </label>
      </div>
      <button
        className="border px-2"
        onClick={createTournament}
        disabled={!name || selected.length === 0}
      >
        Create Tournament
      </button>
    </div>
  );
}
