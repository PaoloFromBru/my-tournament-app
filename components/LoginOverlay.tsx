"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseBrowser";

export default function LoginOverlay({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendCode = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) setMessage(error.message);
    else setPhase("code");
  };

  const verify = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) setMessage(error.message);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="space-y-4 max-w-sm p-4 border bg-white">
          <h2 className="text-xl font-bold">Login</h2>
          {phase === "email" ? (
            <>
              <input
                className="border p-1 w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="border px-2" onClick={sendCode}>
                Send Code
              </button>
            </>
          ) : (
            <>
              <input
                className="border p-1 w-full"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="border px-2" onClick={verify}>
                Verify
              </button>
            </>
          )}
          {message && <p className="text-red-600 text-sm">{message}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
