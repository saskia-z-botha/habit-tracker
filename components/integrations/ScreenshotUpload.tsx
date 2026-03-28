"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle } from "lucide-react";
import { toDateString } from "@/lib/utils";

interface DetectedEvent {
  title: string;
  date?: string;
  time?: string;
  color?: string;
}

export function ScreenshotUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [events, setEvents] = useState<DetectedEvent[] | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<string>(toDateString(new Date()));
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setParsing(true);
    setEvents(null);
    setLogged(false);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/screenshot/parse", { method: "POST", body: form });
      const data = await res.json();
      setEvents(data.events ?? []);
      if (data.suggestedDate) setSuggestedDate(data.suggestedDate);
    } finally {
      setParsing(false);
    }
  }

  async function handleLog() {
    if (!events) return;
    setLogging(true);
    try {
      await fetch("/api/screenshot/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, date: suggestedDate }),
      });
      setLogged(true);
    } finally {
      setLogging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-pink-200 rounded-2xl p-6 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/50 transition"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Calendar screenshot" className="max-h-40 mx-auto rounded-xl object-contain" />
        ) : (
          <div className="space-y-2">
            <Upload size={24} className="mx-auto text-pink-300" />
            <p className="text-sm text-pink-400">Drop a calendar screenshot or click to upload</p>
            <p className="text-xs text-pink-300">PNG, JPG up to 10MB</p>
          </div>
        )}
      </div>

      {/* Parsing state */}
      {parsing && (
        <div className="flex items-center gap-2 text-sm text-pink-400">
          <div className="w-4 h-4 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
          Analysing your calendar…
        </div>
      )}

      {/* Results */}
      {events && !parsing && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-pink-800">
            Found {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-pink-50 rounded-xl px-3 py-2">
                <span className="text-pink-400">📌</span>
                <span className="text-pink-800 font-medium">{e.title}</span>
                {e.time && <span className="text-pink-400 text-xs ml-auto">{e.time}</span>}
              </div>
            ))}
          </div>

          {logged ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={16} />
              Habits logged for {suggestedDate}
            </div>
          ) : (
            <Button onClick={handleLog} disabled={logging} className="w-full">
              {logging ? "Logging…" : `Log habits for ${suggestedDate}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
