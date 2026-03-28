import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchCalendarEvents } from "@/lib/google-calendar";
import { mapEventsToHabits, filterEventsByLocalDate } from "@/lib/habit-mapper";
import { toDateString } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = toDateString(new Date());

  const users = await prisma.user.findMany({
    where: { googleAccessToken: { not: null } },
    select: { id: true },
  });

  const results = { synced: 0, errors: 0 };

  for (const user of users) {
    try {
      const calendarHabits = await prisma.habit.findMany({
        where: {
          userId: user.id,
          sourceType: "GOOGLE_CALENDAR",
          isActive: true,
          calendarKeywords: { isEmpty: false },
        },
      });

      if (!calendarHabits.length) continue;

      const rawEvents = await fetchCalendarEvents(user.id, todayStr);
      const events = filterEventsByLocalDate(rawEvents, todayStr);
      const matches = mapEventsToHabits(events, calendarHabits);

      for (const match of matches) {
        await prisma.habitLog.upsert({
          where: {
            habitId_date: {
              habitId: match.habitId,
              date: new Date(todayStr + "T12:00:00Z"),
            },
          },
          create: {
            habitId: match.habitId,
            userId: user.id,
            date: new Date(todayStr + "T12:00:00Z"),
            completed: true,
            sourceType: "GOOGLE_CALENDAR",
            rawData: JSON.parse(JSON.stringify({ event: match.matchedEvent, keyword: match.matchedKeyword })),
          },
          update: {
            completed: true,
            rawData: JSON.parse(JSON.stringify({ event: match.matchedEvent, keyword: match.matchedKeyword })),
          },
        });
      }

      results.synced++;
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
