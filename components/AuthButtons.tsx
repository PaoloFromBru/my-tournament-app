"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseBrowser";

export default function AuthButtons() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <button className="ml-4 border px-2" onClick={logout}>
        Logout
      </button>
    );
  }
  return null;
}
