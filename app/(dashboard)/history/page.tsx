export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { toDateString } from "@/lib/utils";
import { HistoryCalendar } from "@/components/history/HistoryCalendar";

interface HistoryPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const now = new Date();

  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) - 1 : now.getMonth(); // URL is 1-indexed, JS is 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const startOfMonth = new Date(Date.UTC(year, month, 1));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

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

  const logsByDate: Record<string, { total: number; completed: number }> = {};
  const logsByHabitDate: Record<string, boolean> = {};

  const sortedLogs = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime());
  const seenHabitDates = new Set<string>();

  for (const log of sortedLogs) {
    const dateStr = toDateString(log.date);
    const key = `${log.habitId}|${dateStr}`;
    if (seenHabitDates.has(key)) continue;
    seenHabitDates.add(key);

    if (!logsByDate[dateStr]) logsByDate[dateStr] = { total: 0, completed: 0 };
    logsByDate[dateStr].total++;
    if (log.completed) logsByDate[dateStr].completed++;
    logsByHabitDate[key] = log.completed;
  }

  // Prev/next month links (month in URL is 1-indexed)
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);
  const prevUrl = `/history?month=${prevMonthDate.getMonth() + 1}&year=${prevMonthDate.getFullYear()}`;
  const nextUrl = `/history?month=${nextMonthDate.getMonth() + 1}&year=${nextMonthDate.getFullYear()}`;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
      <HistoryCalendar
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        firstDayOfMonth={firstDayOfMonth}
        totalHabits={totalHabits}
        logsByDate={logsByDate}
        logsByHabitDate={logsByHabitDate}
        habits={habits}
        monthName={monthName}
        prevUrl={prevUrl}
        nextUrl={nextUrl}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  );
}
