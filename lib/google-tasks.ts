import { decrypt } from "./crypto";
import { prisma } from "./db/prisma";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

export interface CompletedTask {
  id: string;
  title: string;
  completed: string; // RFC 3339 timestamp
}

async function getGoogleAccessToken(userId: string): Promise<string | null> {
  // Reuse the token stored by google-calendar (same OAuth credential)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleAccessToken) return null;
  return decrypt(user.googleAccessToken);
}

export async function fetchCompletedTasksForDate(userId: string, date: string): Promise<CompletedTask[]> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return [];

  // Fetch all task lists
  const listsRes = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listsRes.ok) return [];

  const listsData = await listsRes.json();
  const taskListIds: string[] = (listsData.items ?? []).map((l: { id: string }) => l.id);

  const results = await Promise.all(
    taskListIds.map(async (listId) => {
      // Paginate through all tasks — completed recurring instances can be buried past the first page
      type RawTask = { status: string; completed?: string; due?: string };
      const allItems: RawTask[] = [];
      let pageToken: string | undefined;
      do {
        const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true&showHidden=true&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) break;
        const data = await res.json();
        allItems.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
      } while (pageToken);

      return allItems.filter((t) => {
        if (t.status !== "completed" || !t.completed) return false;
        // Use due date if set — it reflects the local calendar day the user intended.
        if (t.due) return t.due.slice(0, 10) === date;
        // No due date: check if completed on `date` or `date+1` UTC.
        // Tasks completed after midnight UTC (e.g. 9pm PDT = 4am UTC next day)
        // will have a UTC completion date one day ahead of the user's local date.
        const completedUtc = t.completed.slice(0, 10);
        if (completedUtc === date) return true;
        const nextDay = new Date(date + "T12:00:00Z");
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        return completedUtc === nextDay.toISOString().slice(0, 10);
      });
    })
  );

  return results.flat() as CompletedTask[];
}
