// Verdict / role / tag style maps. Class-name based so they swap with theme.

import type { Role, TagColor, Verdict } from "./types";

export interface VerdictStyle {
  /** Tailwind background class */
  bg: string;
  /** Tailwind text-color class */
  text: string;
  /** Tailwind border-color class */
  border: string;
  /** Visible label */
  label: string;
}

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  frontrun: {
    bg: "bg-red-bg",
    text: "text-red",
    border: "border-red-bd",
    label: "frontrun",
  },
  unknown: {
    bg: "bg-amber-bg",
    text: "text-amber",
    border: "border-amber-bd",
    label: "unknown",
  },
  normal: {
    bg: "bg-slate-bg",
    text: "text-slate",
    border: "border-slate-bd",
    label: "normal",
  },
  "not checked": {
    bg: "bg-canvas",
    text: "text-text-t",
    border: "border-border-d",
    label: "not checked",
  },
  auto: {
    bg: "bg-green-bg",
    text: "text-green",
    border: "border-green-bd",
    label: "auto",
  },
};

/** Role chips use static (theme-independent) palette in the design. */
export const ROLE_STYLES: Record<Role, { bg: string; text: string }> = {
  arbitrageur: { bg: "#EEF0FA", text: "#3B4A9E" },
  victim:      { bg: "#FAF0EE", text: "#9E3B30" },
  liquidator:  { bg: "#F5EEFC", text: "#7A3B9E" },
  builder:     { bg: "#EFF0F2", text: "#3D4654" },
  pool:        { bg: "#EEF7F7", text: "#2A6A6A" },
  router:      { bg: "#F2F2F2", text: "#4A4A4A" },
  searcher:    { bg: "#FDF8EE", text: "#7A5A1A" },
};

/** Citation tag colors — mix of theme-aware and static. */
export const TAG_COLORS: Record<TagColor, { bg: string; text: string; useVars?: boolean }> = {
  indigo: { bg: "#EEF0FA", text: "#3B4A9E" },
  green:  { bg: "var(--green-bg)", text: "var(--green)", useVars: true },
  slate:  { bg: "var(--slate-bg)", text: "var(--slate)", useVars: true },
  teal:   { bg: "#EEF7F7", text: "#2A6A6A" },
  red:    { bg: "var(--red-bg)", text: "var(--red)", useVars: true },
};

/** Tool call status visual style — Tailwind classes. */
export interface ToolStatusStyle {
  dotClass: string;
  bg: string;
  text: string;
  label: string;
  pulse?: boolean;
  dim?: boolean;
}

export const TOOL_STATUS_STYLES: Record<string, ToolStatusStyle> = {
  done:    { dotClass: "bg-text-t",   bg: "bg-slate-bg", text: "text-slate", label: "done" },
  running: { dotClass: "bg-green",    bg: "bg-green-bg", text: "text-green", label: "running", pulse: true },
  pending: { dotClass: "bg-border-d", bg: "bg-canvas",   text: "text-text-t", label: "pending", dim: true },
  error:   { dotClass: "bg-red",      bg: "bg-red-bg",   text: "text-red",   label: "error" },
};
