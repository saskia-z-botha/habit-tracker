"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Show error from Supabase redirect (e.g. expired link)
    const errorCode = searchParams.get("error_code");
    const errorDesc = searchParams.get("error_description");
    if (errorCode) {
      setError(errorDesc?.replace(/\+/g, " ") ?? "link invalid or expired");
      return;
    }

    // Handle PKCE code exchange client-side
    const code = searchParams.get("code");
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(error.message);
        } else {
          router.replace("/");
        }
      });
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
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
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-pink-900 lowercase">habit tracker</h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
