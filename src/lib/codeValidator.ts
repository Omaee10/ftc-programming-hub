/**
 * Thin client for the real Java grader (see `grader/` and
 * `src/app/api/grade/`). The legacy regex engine that used to live in this
 * file has been replaced with a network round-trip to a Dockerized service
 * that runs `javax.tools.JavaCompiler` and type-aware AST rules.
 *
 * The wire types are kept identical to the original so the workspace UI
 * works unchanged — the only breaking change is that `gradeCode()` and
 * `getChallengeRequirements()` are now async.
 */

// ─── Public types (preserved verbatim from the old module) ───────────────

export type Grade = "good" | "needs-improvement" | "wrong";

/**
 * `behavior` checks are executed test cases rather than static rules — the
 * grader compiles the submission, calls the helper method under test in a
 * sandbox, and compares what it returns. They gate the grade exactly like
 * `required` does.
 */
export type CheckTier = "required" | "improvement" | "style" | "behavior";

/** Mentors author static rules only; behaviour tests ship with the grader. */
export type MentorRuleTier = "required" | "improvement" | "style";

export interface CheckResult {
  label: string;
  description: string;
  tier: CheckTier;
  pass: boolean;
  tip?: string;
  matchedLines?: number[];
}

export interface SyntaxIssue {
  message: string;
  severity: "error" | "warning";
  lines?: number[];
}

export interface GradedResult {
  grade: Grade;
  syntaxIssues: SyntaxIssue[];
  universalResults: CheckResult[];
  requiredResults: CheckResult[];
  improvementResults: CheckResult[];
  styleResults: CheckResult[];
  /**
   * Optional because the grader deploys separately from this app: a Render
   * image that predates the behaviour tier omits the field entirely. It is also
   * absent for challenges with no behaviour coverage, and when the sandbox was
   * unavailable — in every one of those cases the UI simply shows nothing.
   */
  behaviorResults?: CheckResult[];
  score: {
    required: { passed: number; total: number };
    improvement: { passed: number; total: number };
  };
  verdict: {
    title: string;
    subtitle: string;
  };
}

export interface RequirementPreview {
  label: string;
  description: string;
  tier: CheckTier;
  scope: "universal" | "challenge";
}

// ─── Errors surfaced to the UI ────────────────────────────────────────────

export class GraderUnreachableError extends Error {
  constructor(message = "Analyzer is offline. Try again in a moment.") {
    super(message);
    this.name = "GraderUnreachableError";
  }
}

export class GraderTimeoutError extends Error {
  constructor(message = "Analyzer took too long to respond.") {
    super(message);
    this.name = "GraderTimeoutError";
  }
}

// ─── Optional mentor-supplied rubric rules ────────────────────────────────

export interface MentorRuleSpec {
  kind:
    | "callsMethod"
    | "declaresField"
    | "containsLiteral"
    | "extendsClass"
    | "hasAnnotation"
    | "instantiates"
    | "forbidsCall";
  arg: string;
  label?: string;
  description?: string;
  tip?: string;
  tier?: MentorRuleTier;
}

// ─── Implementation ──────────────────────────────────────────────────────

const CLIENT_TIMEOUT_MS = 60_000;

function errorFromResponseBody(status: number, txt: string): string {
  try {
    const parsed = JSON.parse(txt) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* use raw text */
  }
  return txt || `HTTP ${status}`;
}

async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (isAbortLike(e)) {
      throw new GraderTimeoutError();
    }
    throw new GraderUnreachableError();
  }
  if (res.status === 503 || res.status === 504) {
    const txt = await res.text().catch(() => "");
    throw new GraderUnreachableError(errorFromResponseBody(res.status, txt));
  }
  if (res.status === 401 || res.status === 403) {
    throw new GraderUnreachableError(
      "Grader auth failed — GRADER_SECRET on Vercel must match Render."
    );
  }
  if (res.status === 429) {
    throw new GraderUnreachableError("Too many submissions — slow down a moment.");
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new GraderUnreachableError(errorFromResponseBody(res.status, txt));
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", signal });
  } catch (e) {
    if (isAbortLike(e)) throw new GraderTimeoutError();
    throw new GraderUnreachableError();
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new GraderUnreachableError(errorFromResponseBody(res.status, txt));
  }
  return (await res.json()) as T;
}

/**
 * `AbortSignal.timeout()` aborts with `TimeoutError`, the AbortController
 * fallback below with `AbortError`. Both mean "we ran out of time".
 */
function isAbortLike(e: unknown): boolean {
  return (
    (e instanceof DOMException || e instanceof Error) &&
    (e.name === "AbortError" || e.name === "TimeoutError")
  );
}

function timeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout is in Node 17+ and all modern browsers.
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return (AbortSignal as { timeout: (ms: number) => AbortSignal }).timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Submit `code` for grading against the rubric of `challengeId`.
 *
 * Mentor-authored challenges can attach extra rules via `mentorRules`; for
 * built-in challenges the parameter is unused and can be omitted.
 *
 * Throws {@link GraderUnreachableError} if the analyzer is down and
 * {@link GraderTimeoutError} if it takes longer than 15 seconds.
 */
export async function gradeCode(
  code: string,
  challengeId: number,
  mentorRules?: MentorRuleSpec[]
): Promise<GradedResult> {
  return postJson<GradedResult>(
    "/api/grade",
    { code, challengeId, mentorRules },
    timeoutSignal(CLIENT_TIMEOUT_MS)
  );
}

/**
 * Compile-only check for the free-form Code Playground — runs javac against
 * the FTC SDK stubs with no challenge rubric or universal OpMode rules.
 */
export async function compileCode(code: string): Promise<GradedResult> {
  return postJson<GradedResult>(
    "/api/compile",
    { code },
    timeoutSignal(CLIENT_TIMEOUT_MS)
  );
}

/**
 * Preview the rules that will run for a challenge — used by the "Code
 * Requirements" panel in the workspace before any code is submitted.
 */
export async function getChallengeRequirements(
  challengeId: number,
  mentorRules?: MentorRuleSpec[]
): Promise<RequirementPreview[]> {
  if (!mentorRules || mentorRules.length === 0) {
    return getJson<RequirementPreview[]>(
      `/api/grade/requirements?challengeId=${encodeURIComponent(String(challengeId))}`,
      timeoutSignal(CLIENT_TIMEOUT_MS)
    );
  }
  return postJson<RequirementPreview[]>(
    "/api/grade/requirements",
    { challengeId, mentorRules },
    timeoutSignal(CLIENT_TIMEOUT_MS)
  );
}

/**
 * Pings the grader's health endpoint via our proxy. Returns true when the
 * analyzer is reachable. UI components can call this on mount to render a
 * status badge without blocking the user's first submission.
 */
export async function graderIsHealthy(): Promise<boolean> {
  try {
    const res = await fetch("/api/grade/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
