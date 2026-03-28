"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Handle hash fragment (implicit flow: #access_token=...&refresh_token=...)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
          if (error) {
            router.replace("/login?error=auth");
          } else {
            router.replace("/");
          }
        });
        return;
      }
    }

    // Handle code (PKCE flow: ?code=...)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? "/login?error=auth" : "/");
      });
    } else if (tokenHash && type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any }).then(({ error }) => {
        router.replace(error ? "/login?error=auth" : "/");
      });
    } else {
      router.replace("/login?error=auth");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <p className="text-sm text-pink-400">signing you in…</p>
    </div>
  );
}
