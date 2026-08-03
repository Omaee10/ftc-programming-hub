# FTC Programming Hub — Grader Microservice

A small Java + Javalin service that compiles student FTC submissions using
the real `javax.tools.JavaCompiler`, then runs a type-aware AST rubric on
the parsed tree. Replaces the regex-based grader that used to live in
`src/lib/codeValidator.ts`.

A handful of challenges additionally get their helper methods **executed** —
see [Behaviour tests](#behaviour-tests) below.

## Keeping rubrics aligned with challenges

Challenge definitions live in `src/data/challenges.ts`. Each rubric method in
`ChallengeRubrics.java` must have a header comment whose title matches the
challenge title, and its **required checks + tip strings** must match that
challenge's objectives (not generic copy-paste from another challenge).

Before merging rubric changes, run:

```bash
npm run audit:rubrics
```

This fails if any challenge id is missing a rubric header or if titles diverge.

2. Compiles the submission against the bundled FTC SDK source stubs (plus
   any real jars in `libs/`) using an in-memory file manager — no disk I/O.
3. Surfaces structured compile diagnostics with student-friendly wording.
4. Walks the parsed `CompilationUnitTree` to evaluate per-challenge rubric
   rules.
5. Returns a `GradedResultJson` shaped exactly like the existing
   `GradedResult` TypeScript type.

## Endpoints

| Method | Path                       | Description                                       |
| ------ | -------------------------- | ------------------------------------------------- |
| GET    | `/healthz`                 | Warm-up ping; returns stub count and jar count    |
| POST   | `/compile`                 | Compile + grade a submission                      |
| GET    | `/requirements?challengeId=N` | List the rule set for the workspace preview   |
| POST   | `/requirements`            | Same, with mentor-supplied extra rules            |

Every non-health endpoint requires header `X-Grader-Secret: $GRADER_SECRET`
when `GRADER_SECRET` is set.

## Local development

```bash
# From the repo root
docker compose -f grader/docker-compose.yml up --build
# Grader listens on http://localhost:8080
```

Then in `.env.local`:

```
GRADER_URL=http://localhost:8080
GRADER_SECRET=dev-secret-change-me
```

Or run directly without Docker (requires JDK 17):

```bash
cd grader
gradle shadowJar
java -jar build/libs/ftc-grader.jar
```

## FTC SDK sourcing

The grader ships with **source-only stubs** under
`src/main/resources/ftc-stubs/`. These cover the SDK surface that students
actually use (LinearOpMode, DcMotor, Servo, HardwareMap, Gamepad, ElapsedTime,
Telemetry, Pedro Pathing, Road Runner, Limelight). They are enough for any
typical challenge submission to compile cleanly.

For higher-fidelity grading, drop the real FTC jars into `grader/libs/`:

```
grader/libs/
  RobotCore-9.x.jar
  Hardware-9.x.jar
  ...
```

Gradle automatically picks these up via `fileTree("libs")`. The stubs and
real jars can coexist — the JDK classpath resolution picks the first match.

## Deploying to Render (free tier)

### Option A — Blueprint (recommended)

1. [render.com](https://render.com) → **New → Blueprint**
2. Connect repo `ftc-programming-hub`
3. Render reads [`render.yaml`](../render.yaml) at the repo root — creates a Docker
   web service with root directory `grader`
4. When prompted, set **`GRADER_SECRET`** (same value as Vercel)
5. Wait for deploy to finish (**Live** status). First Docker build can take 10–15 min.

### Option B — Manual web service

1. **New → Web Service** → connect repo
2. Settings:

| Field | Value |
|---|---|
| **Root Directory** | `grader` |
| **Runtime** | **Docker** (not Node) |
| **Instance type** | Free |
| **Health Check Path** | `/healthz` |

3. Env var: `GRADER_SECRET`
4. After deploy, set in Vercel:
   - `GRADER_URL` → your Render URL (e.g. `https://ftc-grader.onrender.com`)
   - `GRADER_SECRET` → same secret

The free tier sleeps after ~15 minutes idle; the first request after that may
take 30–60 seconds while the container wakes up.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl: (35) Connection reset by peer` | Service not **Live**, still building, or crash-looping | Render dashboard → **Logs**. Wait for build to finish or fix the error in logs. |
| `Not Found` + `x-render-routing: no-server` | Wrong URL or service deleted | Copy URL from Render dashboard → your service → top of page. |
| Redirect to `/onboarding` | You deployed the **Next.js app** on Render, not the grader | Delete that service; deploy only `grader/` via Docker. Keep Next.js on Vercel. |
| Build fails / out of memory | Free tier is 512 MB | Re-deploy; the image uses SerialGC to fit. Check logs for `OutOfMemoryError`. |
| `401` from grader | Secret mismatch | `GRADER_SECRET` must match on Render and Vercel exactly. |

Test when **Live**:

```bash
curl https://YOUR-SERVICE.onrender.com/healthz
# → {"ok":true,"stubs":48,"libs":0}
```

CI (`.github/workflows/grader-test.yml`) still builds and smoke-tests the
grader on every push to `grader/**`; deploy is from the Render dashboard
(or Blueprint auto-deploy on push).

## Behaviour tests

The AST rubric checks that code has the right *shape*. It cannot tell
`Math.atan2(dy, dx)` from `Math.atan2(dx, dy)`, or catch a `ticksToDegrees()`
that forgets the gear ratio — both call the right methods in the right places.
Behaviour tests close that gap by compiling the submission to bytecode, calling
the helper method with fixed inputs, and comparing what comes back.

They run **in addition to** the rubric, never instead of it. A behaviour failure
forces `grade = "wrong"`, exactly like a failed required check, and arrives on
the wire in a separate `behaviorResults` array.

### Which challenges

Only ones whose answer is a pure helper — callable with plain numbers, no
hardware, no gamepad, no loop:

| Challenge | Method under test |
| --------- | ----------------- |
| 18 Mecanum Power Normalization | `double[] normalize(double, double, double, double)` |
| 24 Encoder Ticks to Degrees    | `double ticksToDegrees(int)` |
| 33 Pythagorean Distance to Goal| `double distanceToGoal(double, double)` |
| 35 Alliance Coordinate Mirror  | `double mirrorX(double)` |
| 36 Degrees ↔ Radians           | `double toRadians(double)`, `double toDegrees(double)` |

Challenges 23 and 34 are deliberately absent: their math lives inline in
`runOpMode()`, so there is no method to call. Testing them would mean either
changing their starter code or building a robot simulator with fake hardware, a
clock, and scripted gamepad input.

Each method gets **several** cases, including edge cases that a hard-coded
return of the value quoted in the challenge instructions will fail.

### Sandbox

This is the only path on which student code is executed, so it runs in a
throwaway JVM — see `behavior/BehaviorRunner.java` (parent) and
`behavior/TestHarness.java` (child). An infinite loop, a `System.exit`, or an
allocation bomb costs one child process and nothing else. The child's
`System.out` is discarded so student prints cannot corrupt the report.

| Env var | Default | Meaning |
|---|---|---|
| `BEHAVIOR_CASE_TIMEOUT_MS`    | `1000`  | Wall clock for one method call |
| `BEHAVIOR_PROCESS_TIMEOUT_MS` | `15000` | Wall clock for the child, JVM startup included |
| `BEHAVIOR_CHILD_HEAP`         | `64m`   | Child `-Xmx` |
| `COMPILE_TIMEOUT_SECONDS`     | `25`    | Ceiling for one `/compile` request |

Cost is ~150 ms on a warm host and **zero** for challenges with no suite — the
extra codegen pass and the fork are both gated on the challenge having tests.

**Failing safe:** a submission that returns the wrong number fails the check,
but a sandbox that will not start, will not report, or cannot load a class is
logged and *skipped* — a grader that cannot run tests must not invent failures
for a student whose code is fine.

### Adding a suite

Add an entry to `behavior/BehaviorSuite.java`. Expectations are exact doubles
computed from the same constants the challenge defines. `scripts/verify-solutions.mjs`
guards the whole set: every answer-key solution must still grade `good`, so a
suite that disagrees with its own reference solution fails there.

## Adding or tuning challenge rubrics

Edit `src/main/java/com/ftchub/grader/rubric/challenges/ChallengeRubrics.java`.
Every rule is built with the `Rules.required(...)`, `Rules.improvement(...)`,
or `Rules.style(...)` fluent factories — no regex required. AST helpers in
`TreeHelpers` cover the common predicates (`callsMethod`, `declaresField`,
`extendsClass`, `instantiatesInsideWhileLoop`, etc.).

## Architecture map

```
src/main/java/com/ftchub/grader/
├── GraderServer.java          ─ Javalin entry point
├── api/                       ─ request/response records
├── compile/                   ─ in-memory javac wrapper + diagnostics
├── rubric/                    ─ rule engine + universal/challenge rules
└── grade/                     ─ orchestrator (compile → rules → verdict)

src/main/resources/
├── ftc-stubs/                 ─ source stubs for the FTC SDK
└── logback.xml                ─ standard logging config
```
