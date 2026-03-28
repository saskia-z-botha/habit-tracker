import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { fetchCalendarEvents } from "@/lib/google-calendar";
import { fetchCompletedTasksForDate } from "@/lib/google-tasks";
import { toDateString } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const today = searchParams.get("date") || toDateString(new Date());

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    select: { id: true, name: true, sourceType: true, calendarKeywords: true, calendarColor: true },
  });

  const calendarHabits = habits.filter((h) => h.sourceType === "GOOGLE_CALENDAR");
  const taskHabits = habits.filter((h) => h.sourceType === "GOOGLE_TASKS");

  let events: unknown[] = [];
  let eventsError: string | null = null;
  let tasks: unknown[] = [];
  let tasksError: string | null = null;

  if (dbUser?.googleAccessToken) {
    try {
      events = await fetchCalendarEvents(user.id, today);
    } catch (e) {
      eventsError = String(e);
    }
    try {
      tasks = await fetchCompletedTasksForDate(user.id, today);
    } catch (e) {
      tasksError = String(e);
    }
  }

  // Check keyword matches
  const calendarMatches = calendarHabits.map((habit) => ({
    habit: habit.name,
    keywords: habit.calendarKeywords,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchedEvent: (events as any[]).find((e: any) =>
      habit.calendarKeywords.some((kw) => e.summary?.toLowerCase().includes(kw.toLowerCase()))
    )?.summary ?? null,
  }));

  const taskMatches = taskHabits.map((habit) => ({
    habit: habit.name,
    keywords: habit.calendarKeywords,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchedTask: (tasks as any[]).find((t: any) =>
      habit.calendarKeywords.some((kw) => t.title?.toLowerCase().includes(kw.toLowerCase()))
    )?.title ?? null,
  }));

  return NextResponse.json({
    today,
    googleConnected: !!dbUser?.googleAccessToken,
    habits,
    calendarEvents: (events as any[]).map((e: any) => ({ title: e.summary, start: e.start?.dateTime ?? e.start?.date })),
    calendarEventsError: eventsError,
    calendarMatches,
    completedTasks: tasks,
    completedTasksError: tasksError,
    taskMatches,
  });
}
