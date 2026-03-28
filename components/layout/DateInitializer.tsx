"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Ensures the URL date param matches the user's local date on first load.
// The server uses UTC, which can be off by hours depending on timezone.
export function DateInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.get("date")) {
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      router.replace(`${pathname}?date=${localDate}`);
    }
  }, [pathname, router, searchParams]);

  return null;
}
