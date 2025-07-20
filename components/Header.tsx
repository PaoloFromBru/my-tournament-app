"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabaseBrowser";

const tabs = [
  { name: "Players", href: "/players" },
  { name: "Teams", href: "/teams" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Settings", href: "/settings" },
];

export default function Header() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.error("getUser error", error.message);
        }
        setUserEmail(data.user?.email ?? null);
      })
      .catch((err) => {
        console.error("getUser failed", err?.message);
        setUserEmail(null);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("logout error", error.message);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
        {/* Left: App identity */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">My Tournament App</h1>
            <p className="text-xs text-gray-500 hidden sm:block">{userEmail ?? ""}</p>
          </div>
        </div>

        {/* Right: Logout */}
        <div className="flex items-center gap-4">
          {userEmail && (
            <button
              onClick={onLogout}
              className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="max-w-4xl mx-auto px-4">
        <ul className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <li key={tab.name}>
                <Link
                  href={tab.href}
                  className={cn(
                    "inline-block px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "text-emerald-600 border-b-2 border-emerald-500"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
