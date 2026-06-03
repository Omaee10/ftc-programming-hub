/** Global UI prefs for FTC Blocks mode (not per-challenge drafts). */

const KEY = "ftc-hub-blocks-prefs-v1";

export interface BlocksPrefs {
  /** Show read-only Generated Java split pane in Blocks mode. */
  showGeneratedJava: boolean;
  /** Coach marks completed (Blocks onboarding). */
  onboardingDone: boolean;
}

const DEFAULTS: BlocksPrefs = {
  showGeneratedJava: true,
  onboardingDone: false,
};

export function readBlocksPrefs(): BlocksPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<BlocksPrefs>;
    return {
      showGeneratedJava:
        parsed.showGeneratedJava ?? DEFAULTS.showGeneratedJava,
      onboardingDone: parsed.onboardingDone ?? DEFAULTS.onboardingDone,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveBlocksPrefs(patch: Partial<BlocksPrefs>): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readBlocksPrefs(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
}
