import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 2) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
        streak >= 30
          ? "bg-orange-100 text-orange-600"
          : streak >= 7
          ? "bg-rose-100 text-rose-600"
          : "bg-pink-100 text-pink-600"
      )}
    >
      {streak}
    </span>
  );
}
