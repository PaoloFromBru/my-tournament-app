"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseBrowser";

export default function AuthButtons() {
  const router = useRouter();
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
      return;
    }
    router.push('/');
  };

  const login = () => {
    router.push('/login');
  };

  return user ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{user.email}</span>
      <button
        className="bg-rose-100 text-rose-700 text-sm px-3 py-1 rounded hover:bg-rose-200"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  ) : (
    <button
      className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
      onClick={login}
    >
      Login
    </button>
  );
}
