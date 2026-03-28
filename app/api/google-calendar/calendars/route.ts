import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleAccessToken) return NextResponse.json({ error: "No Google token" }, { status: 400 });

  const token = decrypt(dbUser.googleAccessToken);
  const res = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 });

  const data = await res.json();
  const calendars = (data.items ?? []).map((c: { id: string; summary: string }) => ({
    id: c.id,
    name: c.summary,
    selected: dbUser.googleCalendarIds.length === 0 || dbUser.googleCalendarIds.includes(c.id),
  }));

  return NextResponse.json(calendars);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { calendarIds } = await request.json();

  await prisma.user.update({
    where: { id: user.id },
    data: { googleCalendarIds: calendarIds },
  });

  return NextResponse.json({ ok: true });
}
