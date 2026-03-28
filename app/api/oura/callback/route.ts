import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { saveOuraTokens } from "@/lib/oura";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?oura=error`);
  }

  const cookieStore = await cookies();
  const verifier = cookieStore.get("oura_pkce_verifier")?.value;
  if (!verifier) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?oura=error`);
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  const res = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NEXT_PUBLIC_OURA_REDIRECT_URI!,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?oura=error`);
  }

  const data = await res.json();

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: {},
  });

  await saveOuraTokens(user.id, data.access_token, data.refresh_token, data.expires_in);

  // Create default Oura habits if they don't exist
  const existingSleep = await prisma.habit.findFirst({
    where: { userId: user.id, sourceType: "OURA_SLEEP" },
  });
  if (!existingSleep) {
    await prisma.habit.create({
      data: {
        userId: user.id,
        name: "Sleep 8 hours",
        icon: "😴",
        color: "rose",
        sourceType: "OURA_SLEEP",
        ouraMetric: "sleep_duration",
        ouraTarget: 28800,
        sortOrder: -2,
      },
    });
  }

  const existingSteps = await prisma.habit.findFirst({
    where: { userId: user.id, sourceType: "OURA_STEPS" },
  });
  if (!existingSteps) {
    await prisma.habit.create({
      data: {
        userId: user.id,
        name: "10,000 steps",
        icon: "👟",
        color: "pink",
        sourceType: "OURA_STEPS",
        ouraMetric: "steps",
        ouraTarget: 10000,
        sortOrder: -1,
      },
    });
  }

  cookieStore.delete("oura_pkce_verifier");
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?oura=connected`);
}
