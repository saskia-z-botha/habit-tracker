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
        `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true&showHidden=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []).filter((t: { status: string; completed?: string; due?: string }) => {
        if (t.status !== "completed" || !t.completed) return false;
        // Use the task's due date (the day the user scheduled it) to avoid UTC midnight shifts.
        // e.g. a task due March 26 completed at 9pm PDT = March 27 UTC — we want March 26.
        // Fall back to UTC completion date if no due date is set.
        const matchDate = t.due ? t.due.slice(0, 10) : t.completed.slice(0, 10);
        return matchDate === date;
      });
    })
  );

  return results.flat() as CompletedTask[];
}
