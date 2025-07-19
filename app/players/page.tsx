"use client";
import { FormEvent, useEffect, useState } from "react";
import PlayersView from "../../components/PlayersView";
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

  const addPlayer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const offense = Number(
      (form.elements.namedItem("offense") as HTMLInputElement).value,
    );
    const defense = Number(
      (form.elements.namedItem("defense") as HTMLInputElement).value,
    );
    if (offense < 0 || offense > 10 || defense < 0 || defense > 10) {
      alert("Skills must be between 0 and 10");
      return;
    }
    await supabase.from("players").insert({
      name,
      offense,
      defense,
      user_id: user.id,
    });
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id);
    setPlayers(data || []);
    form.reset();
  };

  const editPlayer = async (id: number) => {
    if (!user) return;
    const current = players.find((p) => p.id === id);
    if (!current) return;
    const name = window.prompt("Name", current.name) ?? current.name;
    const offense = Number(
      window.prompt("Offense (0-10)", String(current.offense)) ?? current.offense,
    );
    const defense = Number(
      window.prompt("Defense (0-10)", String(current.defense)) ?? current.defense,
    );
    if (offense < 0 || offense > 10 || defense < 0 || defense > 10) {
      alert("Skills must be between 0 and 10");
      return;
    }
    await supabase
      .from("players")
      .update({ name, offense, defense })
      .eq("id", id)
      .eq("user_id", user.id);
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id);
    setPlayers(data || []);
  };

  const changeSkills = async (id: number) => {
    if (!user) return;
    const current = players.find((p) => p.id === id);
    if (!current) return;
    const offense = Number(
      window.prompt("Offense (0-10)", String(current.offense)) ?? current.offense,
    );
    const defense = Number(
      window.prompt("Defense (0-10)", String(current.defense)) ?? current.defense,
    );
    if (offense < 0 || offense > 10 || defense < 0 || defense > 10) {
      alert("Skills must be between 0 and 10");
      return;
    }
    await supabase
      .from("players")
      .update({ offense, defense })
      .eq("id", id)
      .eq("user_id", user.id);
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id);
    setPlayers(data || []);
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
    <PlayersView
      players={players}
      onAdd={addPlayer}
      onEdit={editPlayer}
      onDelete={deletePlayer}
      onChangeSkills={changeSkills}
    />
  );
}
