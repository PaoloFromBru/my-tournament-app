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

  const login = () => {
    // Login overlay appears automatically when no user
  };

  return (
    <>
      {user && <span>{user.email}</span>}
      <button
        className={
          user
            ? "bg-red-500 hover:bg-red-600 text-white px-2"
            : "bg-green-500 hover:bg-green-600 text-white px-2"
        }
        onClick={user ? logout : login}
      >
        {user ? "Logout" : "Login"}
      </button>
    </>
  );
}
