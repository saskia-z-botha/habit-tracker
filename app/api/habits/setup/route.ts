import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

const HABITS = [
  {
    name: "exercise",
    sourceType: "GOOGLE_CALENDAR" as const,
    calendarKeywords: ["pilates", "gym", "run", "yoga", "workout", "spin", "crossfit", "swim"],
  },
  {
    name: "study",
    sourceType: "GOOGLE_CALENDAR" as const,
    calendarKeywords: ["study", "homework", "pset"],
  },
  {
    name: "birth control",
    sourceType: "GOOGLE_TASKS" as const,
    calendarKeywords: ["birth control"],
  },
  {
    name: "acv",
    sourceType: "GOOGLE_TASKS" as const,
    calendarKeywords: ["acv"],
  },
  {
    name: "probiotic",
    sourceType: "GOOGLE_TASKS" as const,
    calendarKeywords: ["probiotic"],
  },
  {
    name: "coconut cult",
    sourceType: "GOOGLE_TASKS" as const,
    calendarKeywords: ["coconut cult"],
  },
];

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Deactivate all existing habits
  await prisma.habit.updateMany({
    where: { userId: user.id },
    data: { isActive: false },
  });

  const results = [];
  for (let i = 0; i < HABITS.length; i++) {
    const h = HABITS[i];
    const existing = await prisma.habit.findFirst({
      where: { userId: user.id, name: h.name },
    });

    if (existing) {
      const updated = await prisma.habit.update({
        where: { id: existing.id },
        data: { sourceType: h.sourceType, calendarKeywords: h.calendarKeywords, sortOrder: i, isActive: true },
      });
      results.push(updated.name);
    } else {
      const created = await prisma.habit.create({
        data: { userId: user.id, name: h.name, sourceType: h.sourceType, calendarKeywords: h.calendarKeywords, sortOrder: i, isActive: true },
      });
      results.push(created.name);
    }
  }

  return NextResponse.json({ habits: results });
}
