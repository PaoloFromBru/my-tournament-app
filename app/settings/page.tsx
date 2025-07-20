"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";
import { Button } from "../../components/ui/button";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const deleteAllData = async () => {
    if (!user) return;
    if (
      !confirm(
        "Delete all players, teams and tournaments? This cannot be undone."
      )
    )
      return;

    await supabase.from("team_players").delete().eq("user_id", user.id);
    await supabase.from("matches").delete().eq("user_id", user.id);
    await supabase.from("tournament_teams").delete().eq("user_id", user.id);
    await supabase.from("tournaments").delete().eq("user_id", user.id);
    await supabase.from("teams").delete().eq("user_id", user.id);
    await supabase.from("players").delete().eq("user_id", user.id);
    alert("All data deleted.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <section className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-4">
        <h3 className="text-red-700 font-semibold">Danger Zone</h3>
        <p className="text-sm text-red-700">
          This will permanently remove all your players, teams and tournaments.
        </p>
        <Button variant="destructive" onClick={deleteAllData}>
          Delete My Data
        </Button>
      </section>
    </div>
  );
}
