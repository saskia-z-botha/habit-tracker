import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { fetchRecentEventTitles } from "@/lib/google-calendar";
import { suggestHabitKeywords } from "@/lib/ai-vision";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const titles = await fetchRecentEventTitles(user.id, 30);
  console.log("[suggest] event titles found:", titles.length, titles);
  if (!titles.length) return NextResponse.json([]);

  const suggestions = await suggestHabitKeywords(titles);
  console.log("[suggest] suggestions:", suggestions);
  return NextResponse.json(suggestions);
}
