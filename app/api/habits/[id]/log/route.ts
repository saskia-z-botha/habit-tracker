import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { date, completed } = body;

  const habit = await prisma.habit.findFirst({
    where: { id, userId: user.id },
  });

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logDate = new Date(date + "T00:00:00Z");

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: id, date: logDate } },
    create: {
      habitId: id,
      userId: user.id,
      date: logDate,
      completed,
      sourceType: "MANUAL",
    },
    update: { completed, sourceType: "MANUAL" },
  });

  return NextResponse.json(log);
}
