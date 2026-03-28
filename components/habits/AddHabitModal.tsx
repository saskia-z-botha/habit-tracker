"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

type SourceType = "MANUAL" | "GOOGLE_CALENDAR" | "GOOGLE_TASKS" | "OURA_SLEEP" | "OURA_STEPS";

const SOURCE_OPTIONS: { value: SourceType; label: string; description: string }[] = [
  { value: "MANUAL", label: "manual", description: "tap to mark done each day" },
  { value: "GOOGLE_CALENDAR", label: "google calendar", description: "detected from calendar events" },
  { value: "GOOGLE_TASKS", label: "google tasks", description: "detected from checked-off tasks" },
  { value: "OURA_SLEEP", label: "oura sleep", description: "auto-tracked from oura ring" },
  { value: "OURA_STEPS", label: "oura steps", description: "auto-tracked from oura ring" },
];

interface AddHabitModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddHabitModal({ open, onClose }: AddHabitModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("GOOGLE_CALENDAR");
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsKeywords = sourceType === "GOOGLE_CALENDAR" || sourceType === "GOOGLE_TASKS";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const keywords = needsKeywords
      ? keywordsRaw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sourceType, calendarKeywords: keywords }),
      });

      if (!res.ok) throw new Error("Failed to create habit");

      setName("");
      setSourceType("GOOGLE_CALENDAR");
      setKeywordsRaw("");
      onClose();
      router.refresh();
    } catch {
      setError("something went wrong. please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="new habit">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-pink-700 mb-1.5 lowercase">name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. exercise"
            maxLength={60}
            autoFocus
            className="lowercase"
          />
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-medium text-pink-700 mb-2 lowercase">tracked from</label>
          <div className="space-y-1.5">
            {SOURCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                  sourceType === opt.value
                    ? "border-pink-300 bg-pink-50"
                    : "border-pink-100 hover:border-pink-200"
                }`}
              >
                <input
                  type="radio"
                  name="sourceType"
                  value={opt.value}
                  checked={sourceType === opt.value}
                  onChange={() => setSourceType(opt.value)}
                  className="accent-pink-400"
                />
                <div>
                  <p className="text-sm text-pink-900 lowercase">{opt.label}</p>
                  <p className="text-xs text-pink-400 lowercase">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Keywords */}
        {needsKeywords && (
          <div>
            <label className="block text-xs font-medium text-pink-700 mb-1.5 lowercase">
              keywords <span className="text-pink-400 font-normal">(comma-separated)</span>
            </label>
            <Input
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              placeholder="e.g. pilates, gym, run, yoga"
              className="lowercase"
            />
            <p className="text-xs text-pink-400 mt-1">
              habit is marked done if any keyword appears in a {sourceType === "GOOGLE_TASKS" ? "task title" : "event title"}
            </p>
          </div>
        )}

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
            {loading ? "adding…" : "add habit"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
