export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { toDateString } from "@/lib/utils";
import { HistoryCalendar } from "@/components/history/HistoryCalendar";

export default async function HistoryPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const activeHabitIds = habits.map((h) => h.id);

  const logs = await prisma.habitLog.findMany({
    where: { userId: user.id, habitId: { in: activeHabitIds }, date: { gte: startOfMonth, lte: endOfMonth } },
    select: { date: true, completed: true, habitId: true },
  });

  const totalHabits = habits.length;

  // Percentage view: grouped by date
  const logsByDate: Record<string, { total: number; completed: number }> = {};
  // Binary view: "habitId|dateStr" -> completed
  const logsByHabitDate: Record<string, boolean> = {};

  // Sort descending so T12:00:00Z (noon) is preferred over T00:00:00Z (midnight) when deduplicating
  const sortedLogs = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime());
  const seenHabitDates = new Set<string>();

  for (const log of sortedLogs) {
    const dateStr = toDateString(log.date);
    const key = `${log.habitId}|${dateStr}`;
    if (seenHabitDates.has(key)) continue; // skip duplicate records for same habit+day
    seenHabitDates.add(key);

    if (!logsByDate[dateStr]) logsByDate[dateStr] = { total: 0, completed: 0 };
    logsByDate[dateStr].total++;
    if (log.completed) logsByDate[dateStr].completed++;
    logsByHabitDate[key] = log.completed;
  }

  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-xl font-semibold text-pink-900 mb-6 lowercase">{monthName}</h1>
      <HistoryCalendar
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        firstDayOfMonth={firstDayOfMonth}
        totalHabits={totalHabits}
        logsByDate={logsByDate}
        logsByHabitDate={logsByHabitDate}
        habits={habits}
      />
    </div>
  );
}
