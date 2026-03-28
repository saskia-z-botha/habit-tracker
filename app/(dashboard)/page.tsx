export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { HabitList } from "@/components/habits/HabitList";
import { DateNav } from "@/components/layout/DateNav";
import { TodayActions } from "@/components/habits/TodayActions";
import { DateInitializer } from "@/components/layout/DateInitializer";
import { RefreshButton } from "@/components/layout/RefreshButton";
import { toDateString, isToday, isYesterday } from "@/lib/utils";
import { fetchOuraSleep, fetchOuraActivity } from "@/lib/oura";
import { fetchCalendarEvents } from "@/lib/google-calendar";
import { fetchCompletedTasksForDate } from "@/lib/google-tasks";
import { mapEventsToHabits, filterEventsByLocalDate } from "@/lib/habit-mapper";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function TodayPage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const dateParam = params.date;

  // If no date param yet, show a blank page while DateInitializer redirects to the local date.
  // This prevents syncing for the wrong UTC date on first load.
  if (!dateParam) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
        <DateInitializer />
      </div>
    );
  }

  // Use UTC noon to avoid timezone-shifting the date when displayed locally
  const date = new Date(dateParam + "T12:00:00Z");

  // Ensure user exists in DB
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: {},
  });

  // Sync if within 2 days of now (handles timezone offsets where local date != UTC date)
  const diffHours = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
  const shouldSync = diffHours >= -26 && diffHours <= 50; // covers UTC±14

  const shouldSyncOura = dbUser.ouraAccessToken && shouldSync;

  if (shouldSyncOura) {
    const [sleepHabit, stepsHabit] = await Promise.all([
      prisma.habit.findFirst({ where: { userId: user.id, sourceType: "OURA_SLEEP", isActive: true } }),
      prisma.habit.findFirst({ where: { userId: user.id, sourceType: "OURA_STEPS", isActive: true } }),
    ]);

    const [sleepResult, activityResult] = await Promise.allSettled([
      fetchOuraSleep(user.id, dateParam),
      fetchOuraActivity(user.id, dateParam),
    ]);

    const sleep = sleepResult.status === "fulfilled" ? sleepResult.value : null;
    const activity = activityResult.status === "fulfilled" ? activityResult.value : null;

    if (sleepHabit && sleep) {
      // Use duration if available (sleep scope), otherwise fall back to score >= 70
      const completed = sleep.total_sleep_duration !== null
        ? sleep.total_sleep_duration >= (sleepHabit.ouraTarget ?? 28800)
        : (sleep.score ?? 0) >= 70;
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: sleepHabit.id, date } },
        create: { habitId: sleepHabit.id, userId: user.id, date, completed, sourceType: "OURA_SLEEP", rawData: sleep as object },
        update: { completed, rawData: sleep as object },
      });
    }

    if (stepsHabit && activity) {
      const completed = activity.steps >= (stepsHabit.ouraTarget ?? 10000);
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: stepsHabit.id, date } },
        create: { habitId: stepsHabit.id, userId: user.id, date, completed, sourceType: "OURA_STEPS", rawData: activity as object },
        update: { completed, rawData: activity as object },
      });
    }
  }

  // Auto-sync Google Calendar + Tasks within 50h window (covers UTC±14 timezone offsets)
  if (dbUser.googleAccessToken && shouldSync) {
    const [calendarHabits, taskHabits] = await Promise.all([
      prisma.habit.findMany({
        where: { userId: user.id, sourceType: "GOOGLE_CALENDAR", isActive: true, calendarKeywords: { isEmpty: false } },
      }),
      prisma.habit.findMany({
        where: { userId: user.id, sourceType: "GOOGLE_TASKS", isActive: true, calendarKeywords: { isEmpty: false } },
      }),
    ]);

    // Calendar events
    if (calendarHabits.length) {
      const rawEvents = await fetchCalendarEvents(user.id, dateParam).catch(() => []);
      const events = filterEventsByLocalDate(rawEvents, dateParam);
      const matches = mapEventsToHabits(events, calendarHabits);
      const matchedIds = new Set(matches.map((m) => m.habitId));
      await Promise.allSettled(calendarHabits.map((habit) => {
        const match = matches.find((m) => m.habitId === habit.id);
        return prisma.habitLog.upsert({
          where: { habitId_date: { habitId: habit.id, date } },
          create: { habitId: habit.id, userId: user.id, date, completed: matchedIds.has(habit.id), sourceType: "GOOGLE_CALENDAR", rawData: match ? { event: match.matchedEvent, keyword: match.matchedKeyword } : {} },
          update: { completed: matchedIds.has(habit.id), ...(match ? { rawData: { event: match.matchedEvent, keyword: match.matchedKeyword } } : {}) },
        });
      }));
    }

    // Google Tasks (checked-off to-dos)
    if (taskHabits.length) {
      const tasks = await fetchCompletedTasksForDate(user.id, dateParam).catch(() => []);
      for (const habit of taskHabits) {
        const matched = tasks.find((task) =>
          habit.calendarKeywords.some((kw) => task.title.toLowerCase().includes(kw.toLowerCase()))
        );
        await prisma.habitLog.upsert({
          where: { habitId_date: { habitId: habit.id, date } },
          create: { habitId: habit.id, userId: user.id, date, completed: !!matched, sourceType: "GOOGLE_TASKS", rawData: matched ? { task: matched } : {} },
          update: { completed: !!matched, ...(matched ? { rawData: { task: matched } } : {}) },
        });
      }
    }
  }

  // Use a full-day range instead of exact timestamp — @db.Date columns compare as dates,
  // and an exact DateTime match can fail depending on Prisma/PostgreSQL casting.
  const dayStart = new Date(dateParam + "T00:00:00Z");
  const dayEnd = new Date(dateParam + "T23:59:59.999Z");

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      logs: { where: { date: { gte: dayStart, lte: dayEnd } } },
    },
  });

  // Calculate streaks — single batched query instead of N+1
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const habitIds = habits.map((h) => h.id);
  const allStreakLogs = habitIds.length
    ? await prisma.habitLog.findMany({
        where: { habitId: { in: habitIds }, date: { gte: yearAgo, lte: new Date() } },
        orderBy: { date: "desc" },
        select: { habitId: true, date: true, completed: true },
      })
    : [];

  // Group logs by habitId (order is preserved from the query)
  const logsByHabit = new Map<string, typeof allStreakLogs>();
  for (const log of allStreakLogs) {
    const arr = logsByHabit.get(log.habitId) ?? [];
    arr.push(log);
    logsByHabit.set(log.habitId, arr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitsWithData = habits.map((habit: any) => {
    const logs = logsByHabit.get(habit.id) ?? [];
    let streak = 0;
    let expectedDate = dateParam; // start streak from the viewed date, not UTC today

    for (const log of logs) {
      const logDate = toDateString(log.date);
      if (logDate === expectedDate) {
        if (log.completed) {
          streak++;
          const d = new Date(log.date);
          d.setDate(d.getDate() - 1);
          expectedDate = toDateString(d);
        } else break;
      } else if (logDate < expectedDate) break;
    }

    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      sourceType: habit.sourceType,
      calendarKeywords: (habit.calendarKeywords ?? []) as string[],
      completed: habit.logs[0]?.completed ?? false,
      streak,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedCount = habitsWithData.filter((h: any) => h.completed).length;
  const total = habitsWithData.length;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
      <DateInitializer />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <DateNav date={date} />
        <div className="flex items-center gap-2">
          <RefreshButton date={dateParam} />
          <TodayActions />
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-pink-900">{completedCount}</span>
            <span className="text-pink-400 text-sm">/ {total} done</span>
          </div>
          <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-300 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Habit list */}

      <HabitList key={dateParam} initialHabits={habitsWithData} date={dateParam} />
    </div>
  );
}
