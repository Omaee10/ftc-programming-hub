# UI Human Redesign — Cursor Prompt

Copy everything below the line into Cursor Agent/Composer when you want a full or partial UI refresh.

---

## Prompt (copy from here)

Redesign the FTC Programming Hub UI to feel **as human as possible** — warm, calm, and approachable — while staying **elegant, modern, and clean**. Do not look like a generic admin template or AI-generated dashboard.

### Design direction

Synthesize (blend, don’t mimic one brand):

- **Apple HIG** — clarity, whitespace, 44px+ touch targets  
- **Material 3** — surface layers, subtle elevation, clear interactive states  
- **Linear / Notion / Stripe** — quiet chrome, strong typography, single accent  
- **Calm / learning apps** — breathing room, encouraging microcopy, visible progress  
- **Inclusive / humane design + WCAG** — plain language, visible focus, contrast-safe text  

**Feel:** A patient mentor’s workspace — one clear focus per screen, secondary details tucked away (progressive disclosure).

### Must follow project rules

- Apply `@ui-ux-human-first` (spacious layout, vertical flow, card-based sections, 16px+ body, 24px+ padding).  
- Apply `@ui-human-redesign` if available (scope + visual language).  
- Keep existing **warm palette** in `src/app/globals.css` (cream/charcoal, `--warm-*`, accent system). Extend tokens; don’t replace with cold gray SaaS defaults.

### Scope — UI/UX ONLY (critical)

**You may change:** presentation in `src/app/**/*.tsx`, `src/components/**`, `src/app/globals.css`, and `src/components/ui/**` — layout, Tailwind/classes, copy shown to users, aria, visual structure.

**You must NOT change:**

- Grader, `codeValidator.ts`, challenge data, API logic, Supabase, `src/lib/**` behavior  
- Submit/grade flows, auth/session logic, Blockly compile, routing guards, localStorage keys  
- Any “fix” that changes what code runs or how challenges are scored  

If unsure whether a line is UI or logic, **leave logic untouched**.

### Execution

1. Start with design tokens + `components/ui/*`, then shell (`AppShell`, `Sidebar`), then high-traffic pages (dashboard, challenges, workspace).  
2. Small, reviewable commits per area — describe what feels more human after each step.  
3. Verify dark, light, and paper themes; mobile sidebar; focus rings; `prefers-reduced-motion`.  

### Done when

- Screens feel spacious and scannable with one obvious focal point.  
- Buttons, cards, and inputs share consistent radius, spacing, and states.  
- Copy sounds human (“You’re ready to start”) not robotic (“Initiate challenge module”).  
- Zero functional/regression changes outside UI files.

Begin by auditing `AppShell`, `Sidebar`, `dashboard`, and `ChallengeWorkspace` — propose a short plan, then implement the highest-impact screen first.

---

## How to use in Cursor

1. **Rules:** `@ui-ux-human-first` and `@ui-human-redesign` in chat, or enable the rules in Cursor Settings → Rules.  
2. **Agent:** Paste the prompt above and add e.g. “Start with dashboard only.”  
3. **Scope tip:** Mention `@src/components/AppShell.tsx` to limit blast radius.
