import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";

const OURA_API_BASE = "https://api.ouraring.com/v2";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start") || "2026-03-01";
  const endDate = searchParams.get("end") || "2026-03-27";

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.ouraAccessToken) return NextResponse.json({ error: "No Oura token" }, { status: 400 });

  const token = decrypt(dbUser.ouraAccessToken);

  const [stepsHabit, sleepHabit] = await Promise.all([
    prisma.habit.findFirst({ where: { userId: user.id, sourceType: "OURA_STEPS", isActive: true } }),
    prisma.habit.findFirst({ where: { userId: user.id, sourceType: "OURA_SLEEP", isActive: true } }),
  ]);

  const results = { steps: 0, sleep: 0, errors: [] as string[] };

  // Backfill steps
  if (stepsHabit) {
    const res = await fetch(
      `${OURA_API_BASE}/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      const entries: Array<{ day: string; steps: number }> = data.data ?? [];
      for (const entry of entries) {
        const date = new Date(entry.day + "T12:00:00Z");
        const completed = entry.steps >= (stepsHabit.ouraTarget ?? 10000);
        await prisma.habitLog.upsert({
          where: { habitId_date: { habitId: stepsHabit.id, date } },
          create: { habitId: stepsHabit.id, userId: user.id, date, completed, sourceType: "OURA_STEPS", rawData: entry as object },
          update: { completed, rawData: entry as object },
        });
        results.steps++;
      }
    } else {
      results.errors.push(`steps API error: ${res.status}`);
    }
  }

  // Backfill sleep
  if (sleepHabit) {
    const [sessionsRes, dailyRes] = await Promise.all([
      fetch(`${OURA_API_BASE}/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${OURA_API_BASE}/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (sessionsRes.ok && dailyRes.ok) {
      const [sessionsData, dailyData] = await Promise.all([sessionsRes.json(), dailyRes.json()]);
      const sessions: Array<{ day: string; total_sleep_duration: number; efficiency: number; type?: string }> = sessionsData.data ?? [];
      const dailyEntries: Array<{ day: string; score: number }> = dailyData.data ?? [];

      // Group sessions by day
      const sessionsByDay = new Map<string, typeof sessions>();
      for (const s of sessions) {
        const arr = sessionsByDay.get(s.day) ?? [];
        arr.push(s);
        sessionsByDay.set(s.day, arr);
      }

      for (const daily of dailyEntries) {
        const daySessions = sessionsByDay.get(daily.day) ?? [];
        const mainSession = daySessions.find(s => s.type === "long_sleep") ?? daySessions[0] ?? null;
        const total_sleep_duration = mainSession?.total_sleep_duration ?? null;
        const efficiency = mainSession?.efficiency ?? 0;

        const rawData = { date: daily.day, total_sleep_duration, efficiency, score: daily.score };
        const completed = total_sleep_duration !== null
          ? total_sleep_duration >= (sleepHabit.ouraTarget ?? 28800)
          : daily.score >= 70;

        const date = new Date(daily.day + "T12:00:00Z");
        await prisma.habitLog.upsert({
          where: { habitId_date: { habitId: sleepHabit.id, date } },
          create: { habitId: sleepHabit.id, userId: user.id, date, completed, sourceType: "OURA_SLEEP", rawData: rawData as object },
          update: { completed, rawData: rawData as object },
        });
        results.sleep++;
      }
    } else {
      results.errors.push(`sleep API error: ${sessionsRes.status}/${dailyRes.status}`);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
