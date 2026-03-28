import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
