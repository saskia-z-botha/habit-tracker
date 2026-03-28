import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { mapEventsToHabits } from "@/lib/habit-mapper";
import { DetectedCalendarEvent } from "@/lib/ai-vision";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { events, date }: { events: DetectedCalendarEvent[]; date: string } = body;

  if (!events?.length || !date) {
    return NextResponse.json({ error: "Missing events or date" }, { status: 400 });
  }

  const calendarHabits = await prisma.habit.findMany({
    where: {
      userId: user.id,
      sourceType: "GOOGLE_CALENDAR",
      isActive: true,
    },
  });

  // Convert AI events to CalendarEvent format for the mapper
  const calendarEvents = events.map((e, i) => ({
    id: `ai-${i}`,
    summary: e.title,
    start: {},
    end: {},
  }));

  const matches = mapEventsToHabits(calendarEvents, calendarHabits);
  const logDate = new Date(date + "T00:00:00Z");

  const logged = [];
  for (const match of matches) {
    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: match.habitId, date: logDate } },
      create: {
        habitId: match.habitId,
        userId: user.id,
        date: logDate,
        completed: true,
        sourceType: "SCREENSHOT_AI",
        rawData: JSON.parse(JSON.stringify({ events, matchedKeyword: match.matchedKeyword })),
      },
      update: {
        completed: true,
        sourceType: "SCREENSHOT_AI",
      },
    });
    logged.push(log);
  }

  return NextResponse.json({ logged: logged.length, matches });
}
