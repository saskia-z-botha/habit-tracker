import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { parseCalendarScreenshot } from "@/lib/ai-vision";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Convert to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // Get this user's habit categories for context
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, isActive: true },
    select: { name: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitCategories = habits.map((h: any) => h.name as string);

  const result = await parseCalendarScreenshot(base64, habitCategories);
  return NextResponse.json(result);
}
