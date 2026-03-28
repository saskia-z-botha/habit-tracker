import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { toDateString } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || toDateString(new Date());
  const date = new Date(dateParam + "T00:00:00Z");

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      logs: {
        where: { date },
      },
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

  const logsByHabit = new Map<string, typeof allStreakLogs>();
  for (const log of allStreakLogs) {
    const arr = logsByHabit.get(log.habitId) ?? [];
    arr.push(log);
    logsByHabit.set(log.habitId, arr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitsWithStreaks = habits.map((habit: any) => {
    const logs = logsByHabit.get(habit.id) ?? [];
    let streak = 0;
    let expectedDate = toDateString(new Date());

    for (const log of logs) {
      const logDate = toDateString(log.date);
      if (logDate === expectedDate) {
        if (log.completed) {
          streak++;
          const d = new Date(log.date);
          d.setDate(d.getDate() - 1);
          expectedDate = toDateString(d);
        } else {
          break;
        }
      } else if (logDate < expectedDate) {
        break;
      }
    }

    return {
      ...habit,
      completed: habit.logs[0]?.completed ?? false,
      streak,
    };
  });

  return NextResponse.json(habitsWithStreaks);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, sourceType, calendarKeywords } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const validSources = ["MANUAL", "GOOGLE_CALENDAR", "GOOGLE_TASKS", "OURA_SLEEP", "OURA_STEPS"];
  const resolvedSource = validSources.includes(sourceType) ? sourceType : "MANUAL";

  // Ensure user exists in our DB
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: {},
  });

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: name.trim(),
      sourceType: resolvedSource,
      calendarKeywords: Array.isArray(calendarKeywords) ? calendarKeywords : [],
    },
  });

  return NextResponse.json(habit, { status: 201 });
}
