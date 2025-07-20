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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] || null);
    setImportMessage(null);
  };

  const importPlayers = async () => {
    if (!user || !csvFile) return;
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
      if (data[0] && data[0][0].toLowerCase() === "name") {
        data.shift();
      }
      const players = data
        .filter((row) => row.length >= 3 && row[0])
        .map(([name, off, def]) => ({
          name,
          offense: Number(off),
          defense: Number(def),
          user_id: user.id,
        }));

      if (!players.length) {
        setImportMessage({ ok: false, text: "No valid rows found" });
        return;
      }

      const { error } = await supabase.from("players").insert(players);
      if (error) {
        setImportMessage({ ok: false, text: error.message });
      } else {
        setImportMessage({
          ok: true,
          text: `Imported ${players.length} players.`,
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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold">Import from CSV</h3>
        <p className="text-sm text-gray-600">
          The file must contain <code>name, offense, defense</code> values on each
          line. The first line may be a header and will be ignored.
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
        <Button variant="destructive" onClick={deleteAllData}>
          Delete My Data
        </Button>
      </section>
    </div>
  );
}
