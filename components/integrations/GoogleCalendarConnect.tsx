"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface Suggestion {
  habitName: string;
  icon: string;
  keywords: string[];
}

interface GoogleCalendarConnectProps {
  connected: boolean;
}

export function GoogleCalendarConnect({ connected }: GoogleCalendarConnectProps) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/google-calendar/suggest");
      const data = await res.json();
      setSuggestions(data);
      setShowWizard(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveSuggestions() {
    setSaving(true);
    try {
      for (const s of suggestions) {
        if (!s.habitName.trim()) continue;
        await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: s.habitName,
            icon: s.icon,
            sourceType: "GOOGLE_CALENDAR",
            calendarKeywords: s.keywords,
          }),
        });
      }
      setShowWizard(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    await fetch("/api/google-calendar/disconnect", { method: "POST" });
    router.refresh();
  }

  if (connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-pink-700 font-medium">Google Calendar connected</span>
          </div>
          <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs text-pink-400">
            disconnect
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSuggestions} disabled={loading}>
          {loading ? "Analyzing calendar…" : "✦ Suggest habits from calendar"}
        </Button>

        <Dialog open={showWizard} onClose={() => setShowWizard(false)} title="Habits from your calendar">
          <div className="space-y-4">
            <p className="text-sm text-pink-500">
              We found these patterns in your calendar. Edit and confirm what to track.
            </p>
            {suggestions.length === 0 && (
              <p className="text-sm text-pink-400 text-center py-4">
                No patterns found in the last 30 days.
              </p>
            )}
            {suggestions.map((s, i) => (
              <div key={i} className="bg-pink-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <Input
                    value={s.habitName}
                    onChange={(e) => {
                      const next = [...suggestions];
                      next[i] = { ...s, habitName: e.target.value };
                      setSuggestions(next);
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.keywords.map((kw, ki) => (
                    <span
                      key={ki}
                      className="text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => setShowWizard(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveSuggestions} disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Add habits"}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <a href="/api/google-calendar/connect">
      <Button variant="secondary" size="sm">
        <span className="text-base leading-none">📅</span>
        Connect Google Calendar
      </Button>
    </a>
  );
}
