"use client";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";
import { Button } from "../../components/ui/button";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [sports, setSports] = useState<{ id: string; display_name: string }[]>([]);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [sportStatus, setSportStatus] = useState("");
  const [sportLoading, setSportLoading] = useState(true);
  const [sportSkills, setSportSkills] = useState<string[]>([]);
  const [payingStatus, setPayingStatus] = useState<string>("free");
  const [donationDate, setDonationDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const loadSports = async () => {
      const { data, error } = await supabase
        .from("sports")
        .select("id, display_name")
        .order("display_name");
      if (!error && data) setSports(data as any);
    };
    loadSports();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUserProfile = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("sport_id, paying_status, donation_date")
        .eq("user_id", user.id)
        .single();
      if (data) {
        if (data.sport_id) setSelectedSportId(data.sport_id);
        if (data.paying_status) setPayingStatus(data.paying_status as string);
        setDonationDate(data.donation_date as string | null);
      }
      setSportLoading(false);
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (!selectedSportId) {
      setSportSkills([]);
      return;
    }
    const loadSkills = async () => {
      const { data } = await supabase
        .from("sports")
        .select("skills")
        .eq("id", selectedSportId)
        .single();
      setSportSkills((data?.skills as string[]) || []);
    };
    loadSkills();
  }, [selectedSportId]);

  const handleSportChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!user) return;
    const newId = e.target.value;
    setSelectedSportId(newId);
    setSportStatus("Saving...");

    const { error } = await supabase
      .from("user_profiles")
      .update({ sport_id: newId })
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update sport:", error);
      setSportStatus("\u274C Failed to save");
    } else {
      setSportStatus("\u2705 Saved");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] || null);
    setImportMessage(null);
  };

  const importPlayers = async () => {
    if (!user || !csvFile || !selectedSportId) return;
    try {
      const text = await csvFile.text();
      const rows = text.trim().split(/\r?\n/);
      if (!rows.length) {
        setImportMessage({ ok: false, text: "File is empty" });
        return;
      }

      const delimiter = rows[0].includes(";") && !rows[0].includes(",") ? ";" : ",";
      const data = rows.map((line) =>
        line.split(delimiter).map((v) => v.trim())
      );

      let header: string[] = [];
      if (data[0] && data[0][0].toLowerCase() === "name") {
        header = data.shift() as string[];
      }

      const skills = header.length ? header.slice(1) : sportSkills;
      if (!skills.length) {
        setImportMessage({ ok: false, text: "No skill columns found" });
        return;
      }

      // If the CSV header defines the skills, update the sport info so
      // the Players view knows about them
      if (header.length) {
        await supabase
          .from("sports")
          .update({ skills })
          .eq("id", selectedSportId);
        setSportSkills(skills);
      }

      const players: { name: string; user_id: string }[] = [];
      const profiles: Record<string, number>[] = [];

      for (const row of data) {
        if (!row[0]) continue;
        const skillValues: Record<string, number> = {};
        skills.forEach((skill, idx) => {
          const val = Number(row[idx + 1]);
          skillValues[skill] = isNaN(val) ? 0 : val;
        });
        players.push({ name: row[0], user_id: user.id });
        profiles.push(skillValues);
      }

      if (!players.length) {
        setImportMessage({ ok: false, text: "No valid rows found" });
        return;
      }

      const { data: inserted, error } = await supabase
        .from("players")
        .insert(players)
        .select("id");

      if (error || !inserted) {
        setImportMessage({ ok: false, text: error?.message || "Failed" });
        return;
      }

      const profileRows = inserted.map((p, i) => ({
        player_id: p.id,
        sport_id: selectedSportId,
        skills: profiles[i],
      }));

      const { error: profError } = await supabase
        .from("player_profiles")
        .insert(profileRows);

      if (profError) {
        setImportMessage({ ok: false, text: profError.message });
      } else {
        setImportMessage({
          ok: true,
          text: `Imported ${profileRows.length} players.`,
        });
        setCsvFile(null);
      }
    } catch (err: any) {
      setImportMessage({ ok: false, text: "Failed to parse file" });
    }
  };

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

  const cleanupDatabase = async () => {
    if (
      !confirm(
        "Remove all records without a user? This cannot be undone."
      )
    )
      return;

    const tables = [
      "matches",
      "team_players",
      "teams",
      "tournaments",
      "players",
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .is("user_id", null);
      if (error) {
        alert(`Failed cleaning ${table}: ${error.message}`);
        return;
      }
    }

    alert("Database cleanup complete.");
  };

  if (sportLoading) return <p className="p-4">Loading settings...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">Subscription</h3>
        <p className="text-sm text-gray-600">Your current support level for the app.</p>
        <div className="mt-3 flex flex-col gap-3">
          {payingStatus === "donated" && donationDate && (
            <div className="text-green-700 text-sm">
              🎉 Thank you for your donation on{" "}
              {new Date(donationDate).toLocaleDateString()}!
            </div>
          )}
          {payingStatus === "pro" && (
            <div className="text-yellow-800 text-sm">🌟 You have Pro access!</div>
          )}
          {payingStatus === "free" && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">You're on the free tier.</span>
              <a
                href="https://buy.stripe.com/test_28EeVe8Fb2OS6fH6dr53O00"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-xs"
              >
                Donate ❤️
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold">User Settings</h3>
        <div>
          <label htmlFor="sport" className="block font-medium mb-2">
            Preferred Sport
          </label>
          <select
            id="sport"
            value={selectedSportId}
            onChange={handleSportChange}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="" disabled>
              Select a sport
            </option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.display_name}
              </option>
            ))}
          </select>
          {sportStatus && (
            <p className="mt-2 text-sm text-gray-600">{sportStatus}</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold">Import from CSV</h3>
        <p className="text-sm text-gray-600">
          Provide a CSV with a <code>name</code> column followed by one column for
          each skill of the selected sport. The first line may be a header and
          will be ignored.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
          {csvFile && (
            <span className="text-sm text-gray-700 truncate">
              {csvFile.name}
            </span>
          )}
        </div>
        <Button onClick={importPlayers} disabled={!csvFile} className="mt-2">
          Import Players
        </Button>
        {importMessage && (
          <p
            className={`text-sm ${
              importMessage.ok ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {importMessage.text}
          </p>
        )}
      </section>

      <section className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-4">
        <h3 className="text-red-700 font-semibold">Danger Zone</h3>
        <p className="text-sm text-red-700">
          This will permanently remove all your players, teams and tournaments.
        </p>
        <div className="flex space-x-2">
          <Button variant="destructive" onClick={deleteAllData}>
            Delete My Data
          </Button>
          <Button variant="destructive" onClick={cleanupDatabase}>
            Database cleanup
          </Button>
        </div>
      </section>

      {/* App version */}
      <div className="mt-8 text-center text-sm text-gray-400">
        MyTournamentApp v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
      </div>
    </div>
  );
}
