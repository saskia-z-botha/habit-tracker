import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";
import { toDateString } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || toDateString(new Date());

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.ouraAccessToken) return NextResponse.json({ error: "No Oura token" }, { status: 400 });

  const token = decrypt(dbUser.ouraAccessToken);

  const prev = new Date(date + "T12:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevDate = prev.toISOString().split("T")[0];

  const res = await fetch(
    `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${prevDate}&end_date=${date}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = res.ok ? await res.json() : { error: res.status };

  const stepsHabit = await prisma.habit.findFirst({
    where: { userId: user.id, sourceType: "OURA_STEPS", isActive: true },
    select: { id: true, ouraTarget: true },
  });

  const stored = stepsHabit ? await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: stepsHabit.id, date: new Date(date + "T12:00:00Z") } },
    select: { completed: true, rawData: true, date: true },
  }) : null;

  return NextResponse.json({
    queryDate: date,
    prevDate,
    apiStatus: res.status,
    entries: data.data ?? data,
    target: stepsHabit?.ouraTarget ?? 10000,
    storedLog: stored,
  });
}
