export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export const difficultyOrder: Difficulty[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export const difficultyConfig: Record<
  Difficulty,
  { label: string; badgeClass: string; glowClass: string }
> = {
  Beginner: {
    label: "Beginner",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glowClass: "shadow-emerald-500/10",
  },
  Intermediate: {
    label: "Intermediate",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    glowClass: "shadow-amber-500/10",
  },
  Advanced: {
    label: "Advanced",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    glowClass: "shadow-red-500/10",
  },
};
