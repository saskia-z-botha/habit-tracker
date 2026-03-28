"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, toDateString, isToday } from "@/lib/utils";

interface DateNavProps {
  date: Date;
}

export function DateNav({ date }: DateNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const today = isToday(date);

  function navigate(offset: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + offset);
    router.push(`${pathname}?date=${toDateString(next)}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 transition"
        aria-label="Previous day"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="text-center min-w-[160px]">
        <p className="text-sm font-semibold text-pink-900 lowercase">
          {today ? "today" : formatDate(date)}
        </p>
      </div>

      <button
        onClick={() => navigate(1)}
        disabled={today}
        className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Next day"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
