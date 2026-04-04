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
      // showHidden=true is required to see recently completed tasks
      const res = await fetch(
        `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []).filter((t: { status: string; completed?: string; due?: string }) => {
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
