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

  // Fetch all tasks from each list (completed + hidden)
  const listResults = await Promise.all(
    taskLists.map(async (list) => {
      const res = await fetch(
        `${TASKS_API_BASE}/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=true&showHidden=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const items = (data.items ?? []).map((t: { title: string; status: string; completed?: string; updated?: string }) => ({
        title: t.title,
        status: t.status,
        completed: t.completed,
        updated: t.updated,
        matchesDate: t.completed ? t.completed.startsWith(date) : false,
      }));
      return { list: list.title, listId: list.id, tasks: items };
    })
  );

  return NextResponse.json({
    date,
    taskHabits,
    taskLists: listResults,
  });
}
