"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Habit {
  id: string;
  name: string;
}

interface DayLog {
  total: number;
  completed: number;
}

interface Props {
  year: number;
  month: number;
  daysInMonth: number;
  firstDayOfMonth: number;
  totalHabits: number;
  logsByDate: Record<string, DayLog>;
  logsByHabitDate: Record<string, boolean>;
  habits: Habit[];
  monthName: string;
  prevUrl: string;
  nextUrl: string;
  isCurrentMonth: boolean;
}

export function HistoryCalendar({
  year,
  month,
  daysInMonth,
  firstDayOfMonth,
  totalHabits,
  logsByDate,
  logsByHabitDate,
  habits,
  monthName,
  prevUrl,
  nextUrl,
  isCurrentMonth,
}: Props) {
  const router = useRouter();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const dayNames = ["su", "mo", "tu", "we", "th", "fr", "sa"];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold text-pink-900 lowercase">{monthName}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(prevUrl)}
            className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 transition"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => router.push(nextUrl)}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Habit selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedHabit(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            selectedHabit === null
              ? "bg-pink-500 text-white"
              : "bg-pink-100 text-pink-600 hover:bg-pink-200"
          }`}
        >
          all habits
        </button>
        {habits.map((h) => (
          <button
            key={h.id}
            onClick={() => setSelectedHabit(h.id === selectedHabit ? null : h.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition lowercase ${
              selectedHabit === h.id
                ? "bg-pink-500 text-white"
                : "bg-pink-100 text-pink-600 hover:bg-pink-200"
            }`}
          >
            {h.name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-pink-100 p-5">
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-pink-300 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture = dateStr > today;
            const isCurrentDay = today === dateStr;

            let bg = "transparent";
            let textColor = "#be185d";

            if (!isFuture) {
              if (selectedHabit) {
                const completed = logsByHabitDate[`${selectedHabit}|${dateStr}`] ?? false;
                bg = completed ? "rgba(244, 114, 182, 0.85)" : "rgba(244, 114, 182, 0.1)";
                textColor = completed ? "#9d174d" : "#be185d";
              } else {
                const dayData = logsByDate[dateStr];
                const ratio = dayData && totalHabits > 0 ? dayData.completed / totalHabits : 0;
                if (ratio > 0) {
                  bg = `rgba(244, 114, 182, ${0.15 + ratio * 0.7})`;
                  textColor = ratio > 0.5 ? "#9d174d" : "#be185d";
                }
              }
            }

            return (
              <div
                key={day}
                onClick={() => { if (!isFuture) router.push(`/?date=${dateStr}`); }}
                className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition
                  ${isFuture ? "opacity-30 cursor-default" : "cursor-pointer hover:ring-2 hover:ring-pink-300"}
                  ${isCurrentDay ? "ring-2 ring-pink-400" : ""}
                `}
                style={{ backgroundColor: bg, color: textColor }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {selectedHabit ? (
        <div className="flex items-center gap-3 text-xs text-pink-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-pink-100" />
            not done
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-pink-400" />
            done
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-xs text-pink-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-pink-100" />
            0%
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-pink-300" />
            50%
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-pink-500" />
            100%
          </div>
        </div>
      )}
    </div>
  );
}
