"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseBrowser";

export default function LoginOverlay({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname.includes("/public");
  const [user, setUser] = useState<any>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] =
    useState<"login" | "register" | "verify" | "reset" | "updatePassword">(
      "login"
    );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isPublic) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setUser(null);
        setPhase("updatePassword");
      } else {
        setUser(session?.user ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [isPublic]);

  const loginUser = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
  };

  const registerUser = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      // No session indicates the user must confirm via email
      if (!data.session) {
        setMessage(
          "Check your email for a confirmation link or code. If you received a magic link, follow it to verify your account."
        );
        setPhase("verify");
      }
    }
  };

  const verify = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Email verified. You can now log in.");
      setPhase("login");
    }
  };

  const resetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset`,
    });
    if (error) setMessage(error.message);
    else setMessage("Check your email for a reset link.");
  };

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated. Please log in.");
      await supabase.auth.signOut();
      setPhase("login");
    }
  };

  useEffect(() => {
    setMessage("");
    setCode("");
    setPassword("");
  }, [phase]);

  if (!user && !isPublic) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="space-y-4 max-w-sm p-4 border bg-white">
          {phase === "login" && (
            <>
              <h2 className="text-xl font-bold">Login</h2>
              <input
                className="border p-1 w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="border p-1 w-full"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="border bg-gray-200 px-2" onClick={loginUser}>
                  Login
                </button>
                <button className="border bg-gray-200 px-2" onClick={() => setPhase("register")}>Register</button>
              </div>
              <button className="text-sm underline" onClick={() => setPhase("reset")}>Forgot password?</button>
            </>
          )}
          {phase === "register" && (
            <>
              <h2 className="text-xl font-bold">Register</h2>
              <input
                className="border p-1 w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="border p-1 w-full"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="border bg-gray-200 px-2" onClick={registerUser}>Register</button>
                <button className="border bg-gray-200 px-2" onClick={() => setPhase("login")}>Back</button>
              </div>
            </>
          )}
          {phase === "verify" && (
            <>
              <h2 className="text-xl font-bold">Enter Confirmation Code</h2>
              <input
                className="border p-1 w-full"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="border bg-gray-200 px-2" onClick={verify}>Verify</button>
                <button className="border bg-gray-200 px-2" onClick={() => setPhase("login")}>Back</button>
              </div>
            </>
          )}
          {phase === "reset" && (
            <>
              <h2 className="text-xl font-bold">Reset Password</h2>
              <input
                className="border p-1 w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="border bg-gray-200 px-2" onClick={resetPassword}>Send Email</button>
                <button className="border bg-gray-200 px-2" onClick={() => setPhase("login")}>Back</button>
              </div>
            </>
          )}
          {phase === "updatePassword" && (
            <>
              <h2 className="text-xl font-bold">Set New Password</h2>
              <input
                className="border p-1 w-full"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="border bg-gray-200 px-2" onClick={updatePassword}>Update</button>
              </div>
            </>
          )}
          {message && <p className="text-red-600 text-sm">{message}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
