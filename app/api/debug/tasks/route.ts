import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";
import { toDateString } from "@/lib/utils";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || toDateString(new Date());

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.googleAccessToken) return NextResponse.json({ error: "No Google token" });

  const token = decrypt(dbUser.googleAccessToken);

  // Fetch task habits and their keywords
  const taskHabits = await prisma.habit.findMany({
    where: { userId: user.id, sourceType: "GOOGLE_TASKS", isActive: true },
    select: { id: true, name: true, calendarKeywords: true },
  });

  // Fetch all task lists
  const listsRes = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listsData = await listsRes.json();
  const taskLists: Array<{ id: string; title: string }> = listsData.items ?? [];

  if (!listsRes.ok || !taskLists.length) {
    return NextResponse.json({
      date,
      taskHabits,
      listsApiStatus: listsRes.status,
      listsApiResponse: listsData,
      taskLists: [],
    });
  }

  // Fetch all tasks from each list (completed + hidden), paginating to get everything
  const listResults = await Promise.all(
    taskLists.map(async (list) => {
      type RawTask = { title: string; status: string; completed?: string; due?: string; updated?: string };
      const allItems: RawTask[] = [];
      let pageToken: string | undefined;
      do {
        const url = `${TASKS_API_BASE}/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=true&showHidden=true&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) break;
        const data = await res.json();
        allItems.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
      } while (pageToken);

      const items = allItems.map((t) => ({
        title: t.title,
        status: t.status,
        completed: t.completed,
        due: t.due,
        updated: t.updated,
      }));
      return { list: list.title, listId: list.id, taskCount: items.length, tasks: items };
    })
  );

  return NextResponse.json({
    date,
    taskHabits,
    taskLists: listResults,
  });
}
