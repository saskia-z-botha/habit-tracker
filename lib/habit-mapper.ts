import { CalendarEvent } from "./google-calendar";

export interface HabitMatch {
  habitId: string;
  matchedEvent: CalendarEvent;
  matchedKeyword: string;
}

export interface HabitWithKeywords {
  id: string;
  calendarKeywords: string[];
  calendarColor?: string | null;
}

// Filter events to only those whose LOCAL start date matches dateStr.
// Calendar event timestamps include a timezone offset (e.g. "2026-03-26T21:00:00-07:00"),
// so we parse that offset to get the real local date instead of using UTC.
export function filterEventsByLocalDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter((event) => {
    if (event.start.date) {
      // All-day event: date is already in the user's local calendar day
      return event.start.date === dateStr;
    }
    if (event.start.dateTime) {
      const offsetMatch = event.start.dateTime.match(/([+-])(\d{2}):(\d{2})$/);
      if (offsetMatch) {
        const sign = offsetMatch[1] === "+" ? 1 : -1;
        const offsetMin = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]));
        const localMs = new Date(event.start.dateTime).getTime() + offsetMin * 60000;
        const d = new Date(localMs);
        const localDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        return localDate === dateStr;
      }
      // UTC event (Z suffix): fall back to UTC date
      return event.start.dateTime.slice(0, 10) === dateStr;
    }
    return false;
  });
}

export function mapEventsToHabits(
  events: CalendarEvent[],
  habits: HabitWithKeywords[]
): HabitMatch[] {
  const matches: HabitMatch[] = [];

  for (const habit of habits) {
    if (!habit.calendarKeywords.length) continue;

    for (const event of events) {
      const title = event.summary?.toLowerCase() ?? "";

      const matchedKeyword = habit.calendarKeywords.find((kw) =>
        title.includes(kw.toLowerCase())
      );

      // Optionally also match on calendar color
      const colorMatch =
        !habit.calendarColor || event.colorId === habit.calendarColor;

      if (matchedKeyword && colorMatch) {
        // Only add one match per habit per day (dedup)
        const alreadyMatched = matches.some((m) => m.habitId === habit.id);
        if (!alreadyMatched) {
          matches.push({ habitId: habit.id, matchedEvent: event, matchedKeyword });
        }
        break;
      }
    }
  }

  return matches;
}

export function suggestKeywordsPrompt(eventTitles: string[]): string {
  return `You are helping set up a habit tracker. Given these calendar event titles from the past 30 days, group them into habit categories and suggest keyword patterns for each group.

Event titles:
${eventTitles.map((t) => `- ${t}`).join("\n")}

Return a JSON object like this:
{
  "habits": [
    {
      "habitName": "Exercise",
      "icon": "🏃",
      "keywords": ["pilates", "run", "gym", "spin", "yoga", "workout", "crossfit", "swim"]
    }
  ]
}

Only include categories where you found at least 2 matching events. Focus on health, wellness, and routine habits. Return only the JSON object, no other text.`;
}
