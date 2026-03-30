import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.ouraAccessToken) return NextResponse.json({ error: "No Oura token" }, { status: 400 });

  const token = decrypt(dbUser.ouraAccessToken);

  const prev = new Date(date + "T12:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevDate = prev.toISOString().split("T")[0];

  const [sessionsRes, dailyRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${prevDate}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${date}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const [sessionsData, dailyData] = await Promise.all([
    sessionsRes.ok ? sessionsRes.json() : { error: sessionsRes.status },
    dailyRes.ok ? dailyRes.json() : { error: dailyRes.status },
  ]);

  return NextResponse.json({
    date,
    prevDate,
    sessions: (sessionsData.data ?? []).map((s: { day: string; type: string; total_sleep_duration: number; efficiency: number; bedtime_start: string; bedtime_end: string }) => ({
      day: s.day,
      type: s.type,
      total_sleep_duration: s.total_sleep_duration,
      efficiency: s.efficiency,
      bedtime_start: s.bedtime_start,
      bedtime_end: s.bedtime_end,
    })),
    daily: dailyData.data?.[0] ?? null,
  });
}
