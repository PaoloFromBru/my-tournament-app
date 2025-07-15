"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");

  const sendCode = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) setMessage(error.message);
    else setPhase("code");
  };

  const verify = async () => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) setMessage(error.message);
    else router.push("/");
  };

  return (
    <div className="space-y-4 max-w-sm">
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
  );
}
