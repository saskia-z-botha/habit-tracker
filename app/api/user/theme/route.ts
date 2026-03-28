import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { THEMES } from "@/lib/themes";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { theme } = await request.json();
  const valid = THEMES.map((t) => t.id);
  if (!valid.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { theme } });
  return NextResponse.json({ ok: true });
}
