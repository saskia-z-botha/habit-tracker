import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { fetchOuraSleep, fetchOuraActivity } from "@/lib/oura";
import { fetchCalendarEvents } from "@/lib/google-calendar";
import { fetchCompletedTasksForDate } from "@/lib/google-tasks";
import { mapEventsToHabits, filterEventsByLocalDate } from "@/lib/habit-mapper";
import { toDateString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || toDateString(new Date());
  const date = new Date(dateParam + "T12:00:00Z");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const synced: string[] = [];

  // Oura sync
  if (dbUser.ouraAccessToken) {
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
      const completed = sleep.total_sleep_duration !== null
        ? sleep.total_sleep_duration >= (sleepHabit.ouraTarget ?? 28800)
        : (sleep.score ?? 0) >= 70;
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: sleepHabit.id, date } },
        create: { habitId: sleepHabit.id, userId: user.id, date, completed, sourceType: "OURA_SLEEP", rawData: sleep as object },
        update: { completed, rawData: sleep as object },
      });
      synced.push("oura_sleep");
    }

    if (stepsHabit && activity) {
      const completed = activity.steps >= (stepsHabit.ouraTarget ?? 10000);
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: stepsHabit.id, date } },
        create: { habitId: stepsHabit.id, userId: user.id, date, completed, sourceType: "OURA_STEPS", rawData: activity as object },
        update: { completed, rawData: activity as object },
      });
      synced.push("oura_steps");
    }
  }

  // Google Calendar + Tasks sync (within 50h window to cover timezone offsets)
  const diffHours = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
  const shouldSync = diffHours >= -26 && diffHours <= 50;
  if (dbUser.googleAccessToken && shouldSync) {
    const [calendarHabits, taskHabits] = await Promise.all([
      prisma.habit.findMany({
        where: { userId: user.id, sourceType: "GOOGLE_CALENDAR", isActive: true, calendarKeywords: { isEmpty: false } },
      }),
      prisma.habit.findMany({
        where: { userId: user.id, sourceType: "GOOGLE_TASKS", isActive: true, calendarKeywords: { isEmpty: false } },
      }),
    ]);

    if (calendarHabits.length) {
      const rawEvents = await fetchCalendarEvents(user.id, dateParam).catch(() => []);
      const events = filterEventsByLocalDate(rawEvents, dateParam);
      const matches = mapEventsToHabits(events, calendarHabits);
      const matchedIds = new Set(matches.map((m) => m.habitId));
      await Promise.allSettled(calendarHabits.map((habit) => {
        const match = matches.find((m) => m.habitId === habit.id);
        return prisma.habitLog.upsert({
          where: { habitId_date: { habitId: habit.id, date } },
          create: { habitId: habit.id, userId: user.id, date, completed: matchedIds.has(habit.id), sourceType: "GOOGLE_CALENDAR", rawData: match ? { event: match.matchedEvent as object, keyword: match.matchedKeyword } : {} },
          update: { completed: matchedIds.has(habit.id), ...(match ? { rawData: { event: match.matchedEvent as object, keyword: match.matchedKeyword } } : {}) },
        });
      }));
      synced.push("google_calendar");
    }

    if (taskHabits.length) {
      const tasks = await fetchCompletedTasksForDate(user.id, dateParam).catch(() => []);
      for (const habit of taskHabits) {
        const matched = tasks.find((task) =>
          habit.calendarKeywords.some((kw) => task.title.toLowerCase().includes(kw.toLowerCase()))
        );
        await prisma.habitLog.upsert({
          where: { habitId_date: { habitId: habit.id, date } },
          create: { habitId: habit.id, userId: user.id, date, completed: !!matched, sourceType: "GOOGLE_TASKS", rawData: matched ? { task: matched as object } : {} },
          update: { completed: !!matched, ...(matched ? { rawData: { task: matched as object } } : {}) },
        });
      }
      synced.push("google_tasks");
    }
  }

  return NextResponse.json({ ok: true, synced });
}
