export type Accent = "sky" | "violet" | "emerald" | "amber" | "rose";

export const ACCENT_OPTIONS: { id: Accent; label: string; color: string }[] = [
  { id: "sky",     label: "Sky",     color: "#0ea5e9" },
  { id: "violet",  label: "Violet",  color: "#8b5cf6" },
  { id: "emerald", label: "Emerald", color: "#10b981" },
  { id: "amber",   label: "Amber",   color: "#f59e0b" },
  { id: "rose",    label: "Rose",    color: "#f43f5e" },
];

const STORAGE_KEY = "ftc-hub-accent";
const DEFAULT: Accent = "sky";
const VALID: Accent[] = ["sky", "violet", "emerald", "amber", "rose"];

export function getAccent(): Accent {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(val as Accent) ? (val as Accent) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function applyAccent(accent: Accent) {
  const html = document.documentElement;
  VALID.forEach((a) => html.classList.remove(`accent-${a}`));
  html.classList.add(`accent-${accent}`);
}

export function saveAccent(accent: Accent) {
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // ignore
  }
  applyAccent(accent);
}
