"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseBrowser";

export default function AuthButtons() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.error('getUser error', error.message);
        }
        setUser(data?.user ?? null);
      })
      .catch((err) => {
        console.error('getUser failed', err?.message);
        setUser(null);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('logout error', error.message);
    }
  };

  const login = () => {
    // Login overlay appears automatically when no user
  };

  return user ? (
    <button
      className="bg-rose-100 text-rose-700 text-sm px-3 py-1 rounded hover:bg-rose-200"
      onClick={logout}
    >
      Logout
    </button>
  ) : (
    <button
      className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
      onClick={login}
    >
      Login
    </button>
  );
}
