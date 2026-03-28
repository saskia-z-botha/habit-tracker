import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie.split(";").flatMap((c) => {
            const eq = c.indexOf("=");
            if (eq < 0) return [];
            const name = c.slice(0, eq).trim();
            const value = c.slice(eq + 1).trim();
            return [{ name, value }];
          });
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") return;
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}; path=${options?.path ?? "/"}`;
            if (options?.maxAge != null) cookie += `; max-age=${options.maxAge}`;
            if (options?.domain) cookie += `; domain=${options.domain}`;
            if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
            if (options?.secure) cookie += `; Secure`;
            document.cookie = cookie;
          });
        },
      },
    }
  );
}
