"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Habit {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sourceType: string;
  calendarKeywords: string[];
  completed: boolean;
  streak: number;
}

interface HabitCardProps {
  habit: Habit;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string) => void;
  onKeywordsUpdate: (id: string, keywords: string[]) => void;
}

export function HabitCard({ habit, onDelete, onRename, onToggle, onKeywordsUpdate }: HabitCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editKeywords, setEditKeywords] = useState((habit.calendarKeywords ?? []).join(", "));
  const inputRef = useRef<HTMLInputElement>(null);
  const keywordsRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (editingKeywords) keywordsRef.current?.focus();
  }, [editingKeywords]);

  function submitKeywords() {
    const keywords = editKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    onKeywordsUpdate(habit.id, keywords);
    setEditingKeywords(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submitRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== habit.name) onRename(habit.id, trimmed);
    setEditing(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 bg-white rounded-2xl border transition-all group",
        habit.completed ? "border-pink-200 bg-pink-50/50" : "border-pink-100 hover:border-pink-200"
      )}
    >
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setEditing(false); }}
            className="text-sm font-medium text-pink-900 bg-transparent border-b border-pink-300 outline-none w-full lowercase"
          />
        ) : editingKeywords ? (
          <div className="space-y-1">
            <p className="text-xs text-pink-400">keywords (comma-separated)</p>
            <input
              ref={keywordsRef}
              value={editKeywords}
              onChange={(e) => setEditKeywords(e.target.value)}
              onBlur={submitKeywords}
              onKeyDown={(e) => { if (e.key === "Enter") submitKeywords(); if (e.key === "Escape") setEditingKeywords(false); }}
              placeholder="e.g. study, pset, homework"
              className="text-sm text-pink-900 bg-transparent border-b border-pink-300 outline-none w-full lowercase"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium leading-tight lowercase",
              habit.completed ? "text-pink-400 line-through" : "text-pink-900"
            )}>
              {habit.name}
            </span>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="opacity-0 group-hover:opacity-100 transition text-pink-300 hover:text-pink-500 px-1 text-base leading-none"
          aria-label="Options"
        >
          ⋯
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-6 z-10 bg-white border border-pink-100 rounded-xl shadow-sm py-1 min-w-[100px]"
            >
              <button
                onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-pink-700 hover:bg-pink-50 transition lowercase"
              >
                rename
              </button>
              {(habit.sourceType === "GOOGLE_CALENDAR" || habit.sourceType === "GOOGLE_TASKS") && (
                <button
                  onClick={() => { setEditKeywords((habit.calendarKeywords ?? []).join(", ")); setEditingKeywords(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-pink-700 hover:bg-pink-50 transition lowercase"
                >
                  edit keywords
                </button>
              )}
              <button
                onClick={() => { onDelete(habit.id); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition lowercase"
              >
                delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status indicator — clickable for manual habits */}
      <div
        role={habit.sourceType === "MANUAL" ? "button" : undefined}
        onClick={habit.sourceType === "MANUAL" ? () => onToggle(habit.id) : undefined}
        aria-label={habit.completed ? "Completed" : "Not completed"}
        className={cn(
          "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center",
          habit.completed ? "bg-pink-400 border-pink-400" : "border-pink-200",
          habit.sourceType === "MANUAL" && "cursor-pointer hover:border-pink-400 transition"
        )}
      >
        <AnimatePresence>
          {habit.completed && (
            <motion.svg
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              width="12" height="12" viewBox="0 0 12 12" fill="none"
            >
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
