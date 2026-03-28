"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function HabitSetupButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [habits, setHabits] = useState<string[]>([]);

  async function run() {
    setStatus("loading");
    try {
      const res = await fetch("/api/habits/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setHabits(data.habits);
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="text-xs text-green-600">
        set up: {habits.join(", ")}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="secondary" onClick={run} disabled={status === "loading"}>
        {status === "loading" ? "setting up…" : "set up my habits"}
      </Button>
      {status === "error" && <p className="text-xs text-rose-500">something went wrong</p>}
    </div>
  );
}
