"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Calendar {
  id: string;
  name: string;
  selected: boolean;
}

export function CalendarPicker() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/google-calendar/calendars")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data)) setCalendars(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const selected = calendars.filter((c) => c.selected).map((c) => c.id);
    await fetch("/api/google-calendar/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarIds: selected }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <p className="text-xs text-pink-400">loading calendars…</p>;

  const selectedCount = calendars.filter((c) => c.selected).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between w-full text-xs text-pink-400 hover:text-pink-600 transition"
      >
        <span>choose which calendars to sync for habit tracking</span>
        <span className="flex items-center gap-1 shrink-0">
          {selectedCount > 0 && <span className="text-pink-400">{selectedCount} selected</span>}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {expanded && (
        <>
          {calendars.map((cal) => (
            <label key={cal.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={cal.selected}
                onChange={() => toggle(cal.id)}
                className="accent-pink-400 w-3.5 h-3.5"
              />
              <span className="text-sm text-pink-800 lowercase group-hover:text-pink-600 transition">
                {cal.name}
              </span>
            </label>
          ))}
          <div className="pt-2 flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={save} disabled={saving}>
              {saving ? "saving…" : "save"}
            </Button>
            {saved && <span className="text-xs text-green-500">saved!</span>}
          </div>
        </>
      )}
    </div>
  );
}
