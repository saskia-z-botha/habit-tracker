export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { OuraConnectButton } from "@/components/integrations/OuraConnectButton";
import { GoogleCalendarConnect } from "@/components/integrations/GoogleCalendarConnect";
import { CalendarPicker } from "@/components/integrations/CalendarPicker";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { ThemePicker } from "@/components/layout/ThemePicker";
import type { ThemeId } from "@/lib/themes";

interface SettingsPageProps {
  searchParams: Promise<{ gcal?: string; oura?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getUser();
  if (!user) redirect("/login");

  const [dbUser, params] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { ouraAccessToken: true, googleAccessToken: true, theme: true },
    }),
    searchParams,
  ]);

  const ouraConnected = !!dbUser?.ouraAccessToken;
  const googleConnected = !!dbUser?.googleAccessToken;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24 md:pb-8">
      <h1 className="text-xl font-semibold text-pink-900 mb-6">Settings</h1>

      {params.gcal === "connected" && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          Google Calendar connected successfully.
        </div>
      )}
      {params.gcal === "error" && (
        <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          Failed to connect Google Calendar. Please try again.
        </div>
      )}

      <div className="space-y-4">
        {/* Account */}
        <Section title="Account">
          <p className="text-sm text-pink-500">{user.email}</p>
          <SignOutButton />
        </Section>

        {/* Theme */}
        <Section title="Theme" description="Choose your color palette.">
          <ThemePicker current={(dbUser?.theme ?? "pink") as ThemeId} />
        </Section>

        {/* Oura */}
        <Section title="Oura Ring" description="Auto-track sleep duration and daily steps.">
          <OuraConnectButton connected={ouraConnected} />
        </Section>

        {/* Google Calendar */}
        <Section title="Google Calendar" description="Auto-detect habits from your calendar events.">
          <GoogleCalendarConnect connected={googleConnected} />
          {googleConnected && <CalendarPicker />}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-pink-900">{title}</h2>
        {description && <p className="text-xs text-pink-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
