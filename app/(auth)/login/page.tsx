"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");

  useEffect(() => {
    const errorCode = searchParams.get("error_code");
    const errorDesc = searchParams.get("error_description");
    if (errorCode) {
      setError(errorDesc?.replace(/\+/g, " ") ?? "link invalid or expired");
    }
  }, [searchParams]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      setError(error.message);
    } else {
      router.replace("/");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6">
      {step === "otp" ? (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-pink-400 lowercase mb-4">
              we sent a code to <span className="text-pink-600">{email}</span>
            </p>
            <label className="block text-sm font-medium text-pink-900 mb-1.5 lowercase">
              code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="enter code"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 bg-pink-50 text-pink-900 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition text-sm tracking-widest text-center"
            />
          </div>
          {error && <p className="text-sm text-rose-500 lowercase">{error}</p>}
          <button
            type="submit"
            disabled={loading || token.length === 0}
            className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm lowercase"
          >
            {loading ? "verifying…" : "sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("email"); setError(""); setToken(""); }}
            className="w-full text-sm text-pink-400 hover:text-pink-600 lowercase"
          >
            use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
          {error && <p className="text-sm text-rose-500 lowercase">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition text-sm lowercase"
          >
            {loading ? "sending…" : "send code"}
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
