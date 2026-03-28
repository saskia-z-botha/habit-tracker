import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { saveGoogleTokens } from "@/lib/google-calendar";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[gcal callback] OAuth error or missing code:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?gcal=error`);
  }

  const user = await getUser();
  if (!user) {
    console.error("[gcal callback] No Supabase user in callback");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[gcal callback] Token exchange failed:", res.status, body);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?gcal=error`);
  }

  const data = await res.json();

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email! },
      update: {},
    });

    await saveGoogleTokens(user.id, data.access_token, data.refresh_token, data.expires_in);
  } catch (err) {
    console.error("[gcal callback] Failed to save tokens:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?gcal=error`);
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?gcal=connected`);
}
