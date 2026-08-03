import { MessagesSquare } from "lucide-react";

/** Community server invite — kept here so the URL lives in exactly one place. */
export const DISCORD_INVITE_URL = "https://discord.gg/YQbKP5rpWb";

/**
 * "Join our Discord" call-to-action.
 *
 * `sidebar` — two-line row for the narrow sidebar footer.
 * `pill`    — single-line pill matching the dashboard's other inline actions.
 *
 * Plain <a> with target="_blank" — no state, no effects, so this stays a
 * server-renderable leaf and does not affect static generation.
 */
export default function DiscordLink({
  variant = "pill",
}: {
  variant?: "sidebar" | "pill";
}) {
  const common = {
    href: DISCORD_INVITE_URL,
    target: "_blank",
    rel: "noopener noreferrer",
  } as const;

  if (variant === "sidebar") {
    return (
      <a
        {...common}
        className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-slate-800/40"
      >
        <MessagesSquare className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:accent-text" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-xs text-slate-500 transition-colors group-hover:text-slate-300">
            Join our Discord
          </span>
          <span className="block truncate text-[10px] text-slate-700">
            Updates, support, and more
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      {...common}
      className="dash-list-item inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all duration-200 hover:text-slate-300"
    >
      <MessagesSquare className="h-3.5 w-3.5 shrink-0" />
      Join our Discord for updates, support, and more
    </a>
  );
}
