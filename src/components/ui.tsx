import React from "react";
import { TaskType } from "@/lib/types";

/** Card surface used across the console. */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

/** Deterministic avatar with initials, colored from the user id. */
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  name,
  id,
  size = "sm",
}: {
  name: string | null | undefined;
  id?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  if (!name) {
    return (
      <span
        className={`inline-flex ${dim} items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500`}
        aria-hidden
      >
        —
      </span>
    );
  }
  const color = AVATAR_COLORS[hashString(id ?? name) % AVATAR_COLORS.length];
  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full font-semibold ${color}`}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/** Minimal inline glyphs per task type (dependency-free). */
export function TypeIcon({ type, className = "h-4 w-4" }: { type: TaskType; className?: string }) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24" } as const;
  switch (type) {
    case "image":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M3 16l5-4 4 3 3-2 6 5" strokeLinejoin="round" />
        </svg>
      );
    case "audio":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 10v4M8 7v10M12 5v14M16 8v8M20 11v2" strokeLinecap="round" />
        </svg>
      );
    case "text":
      return (
        <svg {...common} aria-hidden>
          <path d="M5 5h14M5 10h14M5 15h9" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      );
  }
}

export function TypeBadge({ type, rawType }: { type: TaskType; rawType?: string }) {
  const label = type === "unknown" && rawType ? `unknown · ${rawType}` : type;
  const tone =
    type === "unknown"
      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"
      : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}
    >
      <TypeIcon type={type} className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
