import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleAccessToken) return NextResponse.json({ error: "No Google token" });

  const token = decrypt(dbUser.googleAccessToken);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // List all calendars
  const calListRes = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const calList = await calListRes.json();
  const calendars: Array<{ id: string; summary: string }> = calList.items ?? [];

  // Fetch events from each calendar
  const calendarSummaries = await Promise.all(
    calendars.map(async (cal) => {
      const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${startDate.toISOString()}&timeMax=${new Date().toISOString()}&singleEvents=true&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { calendar: cal.summary, id: cal.id, status: res.status, events: [] };
      const data = await res.json();
      const events = (data.items ?? []).map((e: { summary?: string; start?: { dateTime?: string; date?: string } }) => ({
        title: e.summary,
        date: e.start?.dateTime ?? e.start?.date,
      }));
      return { calendar: cal.summary, id: cal.id, status: res.status, eventCount: events.length, events };
    })
  );

  return NextResponse.json({ calendars: calendarSummaries });
}
