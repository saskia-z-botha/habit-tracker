"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { HabitCard, Habit } from "./HabitCard";

interface HabitListProps {
  initialHabits: Habit[];
  date: string;
}

export function HabitList({ initialHabits, date }: HabitListProps) {
  const [habits, setHabits] = useState(initialHabits);

  const handleToggle = useCallback(async (id: string) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h)));
    try {
      const res = await fetch(`/api/habits/${id}/toggle?date=${date}`, { method: "POST" });
      const data = await res.json();
      setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: data.completed } : h)));
    } catch {
      setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h)));
    }
  }, [date]);

  const handleDelete = useCallback(async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await fetch(`/api/habits/${id}`, { method: "DELETE" });
    } catch {
      // If delete fails, re-fetch would be ideal but for now just leave optimistic state
    }
  }, []);

  const handleRename = useCallback(async (id: string, name: string) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
    try {
      await fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {
      setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name: h.name } : h)));
    }
  }, []);

  const handleKeywordsUpdate = useCallback(async (id: string, keywords: string[]) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, calendarKeywords: keywords } : h)));
    await fetch(`/api/habits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarKeywords: keywords }),
    });
  }, []);

  const completed = habits.filter((h) => h.completed);
  const pending = habits.filter((h) => !h.completed);

  if (!habits.length) {
    return (
      <div className="text-center py-16">
        <p className="text-pink-400 text-sm">no habits yet. add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {pending.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onDelete={handleDelete}
            onRename={handleRename}
            onToggle={handleToggle}
            onKeywordsUpdate={handleKeywordsUpdate}
          />
        ))}
      </AnimatePresence>

      {completed.length > 0 && pending.length > 0 && (
        <div className="flex items-center gap-2 py-2">
          <div className="flex-1 h-px bg-pink-100" />
          <span className="text-xs text-pink-300 font-medium">done</span>
          <div className="flex-1 h-px bg-pink-100" />
        </div>
      )}

      <AnimatePresence initial={false}>
        {completed.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onDelete={handleDelete}
            onRename={handleRename}
            onToggle={handleToggle}
            onKeywordsUpdate={handleKeywordsUpdate}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
