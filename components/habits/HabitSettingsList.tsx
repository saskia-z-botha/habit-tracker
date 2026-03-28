"use client";

import { useState } from "react";

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "manual",
  GOOGLE_CALENDAR: "calendar",
  GOOGLE_TASKS: "tasks",
  OURA_SLEEP: "oura sleep",
  OURA_STEPS: "oura steps",
};

interface HabitRow {
  id: string;
  name: string;
  icon: string | null;
  sourceType: string;
  calendarKeywords: string[];
}

export function HabitSettingsList({ initial }: { initial: HabitRow[] }) {
  const [habits, setHabits] = useState<HabitRow[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editingField, setEditingField] = useState<"name" | "keywords">("name");

  function startEdit(habit: HabitRow, field: "name" | "keywords") {
    setEditingId(habit.id);
    setEditingField(field);
    setEditName(habit.name);
    setEditKeywords(habit.calendarKeywords.join(", "));
  }

  async function saveEdit(habit: HabitRow) {
    const body: Record<string, unknown> =
      editingField === "name"
        ? { name: editName.trim() || habit.name }
        : { calendarKeywords: editKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean) };

    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, ...updated } : h)));
    }
    setEditingId(null);
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  if (!habits.length) {
    return <p className="text-sm text-pink-400">no habits yet — add one from the today view.</p>;
  }

  return (
    <div className="space-y-2">
      {habits.map((habit) => {
        const isEditing = editingId === habit.id;
        const hasKeywords = habit.sourceType === "GOOGLE_CALENDAR" || habit.sourceType === "GOOGLE_TASKS";

        return (
          <div key={habit.id} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-pink-100 bg-pink-50/40 group">
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              {isEditing && editingField === "name" ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveEdit(habit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(habit);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="text-sm font-medium text-pink-900 bg-transparent border-b border-pink-300 outline-none w-full lowercase"
                />
              ) : (
                <button
                  onClick={() => startEdit(habit, "name")}
                  className="text-sm font-medium text-pink-900 lowercase hover:text-pink-600 transition text-left"
                >
                  {habit.name}
                </button>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-pink-400 bg-pink-100 px-1.5 py-0.5 rounded-md">
                  {SOURCE_LABEL[habit.sourceType] ?? habit.sourceType}
                </span>

                {hasKeywords && (
                  isEditing && editingField === "keywords" ? (
                    <input
                      autoFocus
                      value={editKeywords}
                      onChange={(e) => setEditKeywords(e.target.value)}
                      onBlur={() => saveEdit(habit)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(habit);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      placeholder="keyword1, keyword2"
                      className="text-xs text-pink-700 bg-transparent border-b border-pink-300 outline-none lowercase flex-1"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(habit, "keywords")}
                      className="text-xs text-pink-500 hover:text-pink-700 transition lowercase text-left"
                    >
                      {habit.calendarKeywords.length
                        ? habit.calendarKeywords.join(", ")
                        : "+ add keywords"}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteHabit(habit.id)}
              className="opacity-0 group-hover:opacity-100 transition text-pink-300 hover:text-rose-400 text-sm shrink-0 mt-0.5"
              aria-label="Delete habit"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
