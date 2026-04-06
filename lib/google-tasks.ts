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

  // date+1 UTC: tasks completed after midnight UTC (e.g. 9pm PDT = 4am UTC next day)
  // will have a UTC timestamp one day ahead of the user's local date.
  const nextDay = new Date(date + "T12:00:00Z");
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);

  const results = await Promise.all(
    taskListIds.map(async (listId) => {
      // Paginate through all tasks — completed recurring instances can be buried past the first page
      type RawTask = { id: string; title: string; status: string; completed?: string; due?: string; updated?: string };
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

      const matched: CompletedTask[] = [];

      for (const t of allItems) {
        // --- Case 1: Explicitly completed task (non-recurring or briefly-visible recurring) ---
        if (t.status === "completed" && t.completed) {
          // Use due date if set — it reflects the local calendar day the user intended.
          if (t.due) {
            if (t.due.slice(0, 10) === date) matched.push(t as CompletedTask);
          } else {
            // No due date: match by completion UTC timestamp (accept date+1 for late-night completions)
            const completedUtc = t.completed.slice(0, 10);
            if (completedUtc === date || completedUtc === nextDayStr) matched.push(t as CompletedTask);
          }
          continue;
        }

        // --- Case 2: Recurring task — completed instance disappears immediately ---
        // When a recurring task is completed, Google creates the next pending instance right away.
        // The new instance's `updated` timestamp = the moment the previous one was completed.
        // Signal: status=needsAction, due date rolled forward past `date`, updated on `date` or `date+1` UTC.
        if (t.status === "needsAction" && t.due && t.updated) {
          const dueDateStr = t.due.slice(0, 10);
          const updatedUtc = t.updated.slice(0, 10);
          // Due must be strictly after `date` (rolled forward), and updated on the target date
          if (dueDateStr > date && (updatedUtc === date || updatedUtc === nextDayStr)) {
            matched.push({ id: t.id, title: t.title, completed: t.updated });
          }
        }
      }

      return matched;
    })
  );

  return results.flat();
}
