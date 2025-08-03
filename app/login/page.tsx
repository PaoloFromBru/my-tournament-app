"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      router.replace("/");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) setMessage(error.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="flex justify-center mb-4">
          <Image src="/apple-touch-icon.png" alt="App Logo" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome Back</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Login to your account</p>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 py-2 mb-4 border border-gray-300 rounded-xl hover:bg-gray-100"
        >
          <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
          Continue with Google
        </button>

        <div className="flex items-center justify-center mb-4">
          <span className="border-b border-gray-300 w-1/4"></span>
          <span className="text-sm text-gray-500 mx-2">or</span>
          <span className="border-b border-gray-300 w-1/4"></span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}

        <p className="text-sm text-center text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

