import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface DetectedCalendarEvent {
  title: string;
  date?: string;
  time?: string;
  color?: string;
}

export interface ParsedCalendarResult {
  events: DetectedCalendarEvent[];
  suggestedDate?: string;
}

export async function parseCalendarScreenshot(
  imageBase64: string,
  habitCategories: string[]
): Promise<ParsedCalendarResult> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `This is a screenshot of a calendar. Extract all visible events.

For each event return: { "title": string, "date": "YYYY-MM-DD or null", "time": "HH:MM or null", "color": "color name if visible or null" }

Also identify the primary date shown in the screenshot as "suggestedDate" (YYYY-MM-DD).

Known habit categories to look for: ${habitCategories.join(", ")}

Return only valid JSON in this format:
{
  "suggestedDate": "YYYY-MM-DD or null",
  "events": [...]
}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return { events: [] };

  try {
    return JSON.parse(content) as ParsedCalendarResult;
  } catch {
    return { events: [] };
  }
}

export async function suggestHabitKeywords(eventTitles: string[]): Promise<
  Array<{ habitName: string; icon: string; keywords: string[] }>
> {
  const { suggestKeywordsPrompt } = await import("./habit-mapper");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: suggestKeywordsPrompt(eventTitles) }],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    return [];
  } catch {
    return [];
  }
}
