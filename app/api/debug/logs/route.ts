import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const logs = await prisma.habitLog.findMany({
    where: {
      userId: user.id,
      date: { gte: new Date(date + "T00:00:00Z"), lte: new Date(date + "T23:59:59Z") },
    },
    include: { habit: { select: { name: true, sourceType: true, ouraTarget: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(logs.map((l) => ({
    habit: l.habit.name,
    source: l.habit.sourceType,
    target: l.habit.ouraTarget,
    completed: l.completed,
    date: l.date,
    rawData: l.rawData,
  })));
}
