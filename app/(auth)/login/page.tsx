"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-pink-900 lowercase">habits</h1>
          <p className="text-sm text-pink-400 mt-1 lowercase">your daily ritual tracker</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
          {sent ? (
            <div className="text-center py-4 space-y-2">
              <p className="font-medium text-pink-900 lowercase">check your inbox</p>
              <p className="text-sm text-pink-400 lowercase">
                we sent a magic link to <span className="text-pink-600">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pink-900 mb-1.5 lowercase">
                  email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 bg-pink-50 text-pink-900 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-rose-500 lowercase">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm lowercase"
              >
                {loading ? "sending…" : "send magic link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
