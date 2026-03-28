import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { toDateString } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || toDateString(new Date());
  const date = new Date(dateParam + "T12:00:00Z");

  const habit = await prisma.habit.findFirst({
    where: { id, userId: user.id },
  });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });

  const newCompleted = !(existing?.completed ?? false);

  await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: id, date } },
    create: { habitId: id, userId: user.id, date, completed: newCompleted, sourceType: "MANUAL" },
    update: { completed: newCompleted },
  });

  return NextResponse.json({ completed: newCompleted });
}
