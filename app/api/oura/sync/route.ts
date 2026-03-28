import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchOuraSleep, fetchOuraActivity } from "@/lib/oura";
import { toDateString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // Protect cron endpoint
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = toDateString(today);
  const yesterdayStr = toDateString(yesterday);

  // Get all users with Oura connected
  const users = await prisma.user.findMany({
    where: { ouraAccessToken: { not: null } },
    select: { id: true },
  });

  const results = { synced: 0, errors: 0 };

  for (const user of users) {
    try {
      // Sync sleep (for yesterday — Oura sleep offset)
      const sleepHabit = await prisma.habit.findFirst({
        where: { userId: user.id, sourceType: "OURA_SLEEP", isActive: true },
      });

      if (sleepHabit) {
        const sleep = await fetchOuraSleep(user.id, yesterdayStr);
        if (sleep) {
          const completed = sleep.total_sleep_duration >= (sleepHabit.ouraTarget ?? 28800);
          await prisma.habitLog.upsert({
            where: {
              habitId_date: {
                habitId: sleepHabit.id,
                date: new Date(yesterdayStr + "T12:00:00Z"),
              },
            },
            create: {
              habitId: sleepHabit.id,
              userId: user.id,
              date: new Date(yesterdayStr + "T12:00:00Z"),
              completed,
              sourceType: "OURA_SLEEP",
              rawData: sleep as object,
            },
            update: {
              completed,
              rawData: sleep as object,
            },
          });
        }
      }

      // Sync steps (for today)
      const stepsHabit = await prisma.habit.findFirst({
        where: { userId: user.id, sourceType: "OURA_STEPS", isActive: true },
      });

      if (stepsHabit) {
        const activity = await fetchOuraActivity(user.id, todayStr);
        if (activity) {
          const completed = activity.steps >= (stepsHabit.ouraTarget ?? 10000);
          await prisma.habitLog.upsert({
            where: {
              habitId_date: {
                habitId: stepsHabit.id,
                date: new Date(todayStr + "T12:00:00Z"),
              },
            },
            create: {
              habitId: stepsHabit.id,
              userId: user.id,
              date: new Date(todayStr + "T12:00:00Z"),
              completed,
              sourceType: "OURA_STEPS",
              rawData: activity as object,
            },
            update: {
              completed,
              rawData: activity as object,
            },
          });
        }
      }

      results.synced++;
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
