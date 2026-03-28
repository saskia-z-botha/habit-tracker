import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const habit = await prisma.habit.findFirst({
    where: { id, userId: user.id },
  });

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.habit.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.calendarKeywords !== undefined && { calendarKeywords: body.calendarKeywords }),
      ...(body.calendarColor !== undefined && { calendarColor: body.calendarColor }),
      ...(body.sourceType !== undefined && { sourceType: body.sourceType }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const habit = await prisma.habit.findFirst({
    where: { id, userId: user.id },
  });

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete
  await prisma.habit.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
