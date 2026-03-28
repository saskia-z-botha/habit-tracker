import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.ouraAccessToken) return NextResponse.json({ error: "No Oura token" });

  const token = decrypt(dbUser.ouraAccessToken);

  // For sleep sessions: query prev day too — Oura tags sessions by bedtime_start date,
  // so a session starting March 22 at 11pm may be stored under March 22, not March 23.
  const prevDate = new Date(date + "T12:00:00Z");
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevDateStr = prevDate.toISOString().split("T")[0];

  const [sleepSessionsRes, dailySleepRes, activityRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${prevDateStr}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${date}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${prevDateStr}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const [sleepSessions, dailySleep, activity] = await Promise.all([
    sleepSessionsRes.json(),
    dailySleepRes.json(),
    activityRes.json(),
  ]);

  // Extract the key values we care about
  const summary = {
    date,
    sleep_sessions_endpoint: {
      status: sleepSessionsRes.status,
      sessions_found: sleepSessions.data?.length ?? 0,
      total_sleep_duration_seconds: sleepSessions.data?.reduce((s: number, x: { total_sleep_duration?: number }) => s + (x.total_sleep_duration ?? 0), 0) ?? null,
      total_sleep_hours: sleepSessions.data?.length
        ? Math.round(sleepSessions.data.reduce((s: number, x: { total_sleep_duration?: number }) => s + (x.total_sleep_duration ?? 0), 0) / 360) / 10
        : null,
      raw: sleepSessions.data,
    },
    daily_sleep_endpoint: {
      status: dailySleepRes.status,
      found: dailySleep.data?.length ?? 0,
      score: dailySleep.data?.[0]?.score ?? null,
      raw: dailySleep.data,
    },
    activity_endpoint: {
      status: activityRes.status,
      steps: activity.data?.[0]?.steps ?? null,
      raw: activity.data,
    },
  };

  return NextResponse.json(summary);
}
