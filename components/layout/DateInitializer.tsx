"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Module-level flag: false on fresh page load/reload, true after first navigation within the session.
// This lets us distinguish "user opened site" (should show today) from
// "user navigated to a past date within the app" (should keep that date).
let sessionStarted = false;

export function DateInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const dateParam = searchParams.get("date");

    if (!sessionStarted) {
      // Fresh load (bookmark, reload, typing URL) — always go to today
      sessionStarted = true;
      if (dateParam !== localDate) {
        router.replace(`${pathname}?date=${localDate}`);
      }
    } else if (!dateParam) {
      // In-app navigation to / with no date (e.g. clicking "today" in nav)
      router.replace(`${pathname}?date=${localDate}`);
    }
  }, [pathname, router, searchParams]);

  return null;
}
