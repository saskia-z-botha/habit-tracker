import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  // PKCE flow
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const cookieStore = await cookies();
  cookieStore.set("oura_pkce_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_OURA_REDIRECT_URI!,
    response_type: "code",
    scope: "daily sleep personal",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(
    `https://cloud.ouraring.com/oauth/authorize?${params}`
  );
}
