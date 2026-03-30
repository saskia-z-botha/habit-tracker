import { encrypt, decrypt } from "./crypto";
import { prisma } from "./db/prisma";

const OURA_API_BASE = "https://api.ouraring.com/v2";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export interface OuraSleepData {
  date: string;
  total_sleep_duration: number | null; // seconds, from /sleep endpoint (requires sleep scope)
  efficiency: number;
  score: number | null; // from daily_sleep endpoint (requires daily scope)
}

export interface OuraActivityData {
  date: string;
  steps: number;
}

async function refreshOuraToken(userId: string, refreshToken: string) {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh Oura token");

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      ouraAccessToken: encrypt(data.access_token),
      ouraRefreshToken: encrypt(data.refresh_token),
      ouraTokenExpiresAt: expiresAt,
    },
  });

  return data.access_token as string;
}

async function getOuraAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.ouraAccessToken) return null;

  const token = decrypt(user.ouraAccessToken);

  // Refresh if expiring within 5 minutes
  if (user.ouraTokenExpiresAt && user.ouraTokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    if (!user.ouraRefreshToken) return null;
    return refreshOuraToken(userId, decrypt(user.ouraRefreshToken));
  }

  return token;
}

export async function fetchOuraSleep(userId: string, date: string): Promise<OuraSleepData | null> {
  const token = await getOuraAccessToken(userId);
  if (!token) return null;

  // Oura tags sleep sessions by bedtime_start date, but daily_sleep uses the wake-up date.
  // A session starting March 22 at 11pm has day="2026-03-22", but daily_sleep.day="2026-03-23".
  // Query prev day + current day to catch sessions regardless of which side of midnight they start.
  const prev = new Date(date + "T12:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevDate = prev.toISOString().split("T")[0];

  const [sessionsRes, dailyRes] = await Promise.all([
    fetch(`${OURA_API_BASE}/usercollection/sleep?start_date=${prevDate}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${OURA_API_BASE}/usercollection/daily_sleep?start_date=${date}&end_date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const [sessionsData, dailyData] = await Promise.all([
    sessionsRes.ok ? sessionsRes.json() : { data: [] },
    dailyRes.ok ? dailyRes.json() : { data: [] },
  ]);

  const sessions: Array<{ day: string; total_sleep_duration: number; efficiency: number; type?: string }> = sessionsData.data ?? [];
  const daily = dailyData.data?.[0] ?? null;

  if (!sessions.length && !daily) return null;

  // Filter to sessions for the target date (day = wake-up date in Oura v2)
  // Fall back to prevDate sessions if none found (edge case: sleep ending just after midnight)
  const dateSessions = sessions.filter(s => s.day === date);
  const sessionPool = dateSessions.length > 0 ? dateSessions : sessions.filter(s => s.day === prevDate);

  // Prefer the long_sleep session (main overnight sleep, not naps)
  const mainSession = sessionPool.find(s => s.type === "long_sleep") ?? sessionPool[0] ?? null;

  const total_sleep_duration = mainSession?.total_sleep_duration ?? null;
  const efficiency = mainSession?.efficiency ?? 0;
  const score: number | null = daily?.score ?? null;

  return { date, total_sleep_duration, efficiency, score };
}

export async function fetchOuraActivity(userId: string, date: string): Promise<OuraActivityData | null> {
  const token = await getOuraAccessToken(userId);
  if (!token) return null;

  // Query prev day too — like sleep, activity can be attributed to a different date
  // depending on when the ring last synced relative to midnight.
  const prev = new Date(date + "T12:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevDate = prev.toISOString().split("T")[0];

  const res = await fetch(
    `${OURA_API_BASE}/usercollection/daily_activity?start_date=${prevDate}&end_date=${date}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const entries: Array<{ day: string; steps: number }> = data.data ?? [];

  if (!entries.length) return null;

  const entry = entries.find(e => e.day === date);
  if (!entry) return null;

  return { date: entry.day, steps: entry.steps };
}

export async function saveOuraTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ouraAccessToken: encrypt(accessToken),
      ouraRefreshToken: encrypt(refreshToken),
      ouraTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
}
