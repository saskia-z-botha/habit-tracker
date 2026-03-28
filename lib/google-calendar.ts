import { encrypt, decrypt } from "./crypto";
import { prisma } from "./db/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
}

async function refreshGoogleToken(userId: string, refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Google token");

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: encrypt(data.access_token),
      googleTokenExpiresAt: expiresAt,
    },
  });

  return data.access_token as string;
}

async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleAccessToken) return null;

  const token = decrypt(user.googleAccessToken);

  if (user.googleTokenExpiresAt && user.googleTokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    if (!user.googleRefreshToken) return null;
    return refreshGoogleToken(userId, decrypt(user.googleRefreshToken));
  }

  return token;
}

async function fetchAllCalendarIds(token: string, userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { googleCalendarIds: true } });
  const saved = user?.googleCalendarIds ?? [];

  // If user has a saved selection, use it directly
  if (saved.length > 0) return saved;

  // Otherwise fetch all calendars
  const res = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return ["primary"];
  const data = await res.json();
  return (data.items ?? []).map((c: { id: string }) => c.id);
}

export async function fetchCalendarEvents(userId: string, date: string): Promise<CalendarEvent[]> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return [];

  const startOfDay = new Date(date + "T00:00:00Z").toISOString();
  // Extend end by 14h to cover UTC-14 (e.g. 5pm PDT = next day 00:00 UTC, needs window past midnight)
  const endDate = new Date(date + "T00:00:00Z");
  endDate.setUTCHours(37, 59, 59, 0); // next day 13:59:59 UTC — covers any timezone
  const endOfDay = endDate.toISOString();

  const calendarIds = await fetchAllCalendarIds(token, userId);

  const results = await Promise.all(
    calendarIds.map(async (calId) => {
      const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calId)}/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.items ?? [];
    })
  );

  return results.flat();
}

export async function fetchRecentEventTitles(userId: string, days = 30): Promise<string[]> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const calendarIds = await fetchAllCalendarIds(token, userId);

  const results = await Promise.all(
    calendarIds.map(async (calId) => {
      const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calId)}/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&maxResults=500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []).map((e: CalendarEvent) => e.summary).filter(Boolean);
    })
  );

  const allTitles: string[] = results.flat();
  return [...new Set(allTitles)];
}

export async function saveGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: encrypt(accessToken),
      // Google only returns a new refresh token on first auth or after revocation
      ...(refreshToken ? { googleRefreshToken: encrypt(refreshToken) } : {}),
      googleTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
}
