import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchOuraSleep, fetchOuraActivity } from "@/lib/oura";
import { getUser } from "@/lib/supabase/server";
import { localDateString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const todayStr = searchParams.get("date") || localDateString();

  const results = { sleep: null as boolean | null, steps: null as number | null };

  // Sync sleep — Oura attributes sleep to the day you wake up, query today
  const sleepHabit = await prisma.habit.findFirst({
    where: { userId: user.id, sourceType: "OURA_SLEEP", isActive: true },
  });

  if (sleepHabit) {
    const sleep = await fetchOuraSleep(user.id, todayStr);
    if (sleep) {
      const completed = sleep.total_sleep_duration !== null
        ? sleep.total_sleep_duration >= (sleepHabit.ouraTarget ?? 28800)
        : (sleep.score ?? 0) >= 70;
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: sleepHabit.id, date: new Date(todayStr + "T00:00:00Z") } },
        create: { habitId: sleepHabit.id, userId: user.id, date: new Date(todayStr + "T00:00:00Z"), completed, sourceType: "OURA_SLEEP", rawData: sleep as object },
        update: { completed, rawData: sleep as object },
      });
      results.sleep = completed;
    }
  }

  // Sync steps (today's data)
  const stepsHabit = await prisma.habit.findFirst({
    where: { userId: user.id, sourceType: "OURA_STEPS", isActive: true },
  });

  if (stepsHabit) {
    const activity = await fetchOuraActivity(user.id, todayStr);
    if (activity) {
      const completed = activity.steps >= (stepsHabit.ouraTarget ?? 10000);
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: stepsHabit.id, date: new Date(todayStr + "T00:00:00Z") } },
        create: { habitId: stepsHabit.id, userId: user.id, date: new Date(todayStr + "T00:00:00Z"), completed, sourceType: "OURA_STEPS", rawData: activity as object },
        update: { completed, rawData: activity as object },
      });
      results.steps = activity.steps;
    }
  }

  return NextResponse.json(results);
}
