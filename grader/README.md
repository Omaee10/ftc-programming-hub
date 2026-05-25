# FTC Programming Hub — Grader Microservice

A small Java + Javalin service that compiles student FTC submissions using
the real `javax.tools.JavaCompiler`, then runs a type-aware AST rubric on
the parsed tree. Replaces the regex-based grader that used to live in
`src/lib/codeValidator.ts`.

## What it does

1. Accepts `POST /compile { code, challengeId, mentorRules? }`.
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

1. Sign up at [render.com](https://render.com) and connect this repo.
2. **New → Web Service** with:
   - **Root Directory:** `grader`
   - **Runtime:** Docker
   - **Instance type:** Free
   - **Health Check Path:** `/healthz`
3. Add env var `GRADER_SECRET` (generate with `openssl rand -hex 32`).
4. After deploy, set the same values in Vercel:
   - `GRADER_URL` → your Render URL (e.g. `https://ftc-grader.onrender.com`)
   - `GRADER_SECRET` → same secret as above

The free tier sleeps after ~15 minutes idle; the first request after that may
take 30–60 seconds while the container wakes up.

CI (`.github/workflows/grader-test.yml`) still builds and smoke-tests the
grader on every push to `grader/**`; deploy is manual from the Render dashboard
(or connect Render auto-deploy on push).

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
