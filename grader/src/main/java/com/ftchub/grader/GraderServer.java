package com.ftchub.grader;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.api.MentorRuleSpec;
import com.ftchub.grader.behavior.BehaviorRunner;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.compile.StubLoader;
import com.ftchub.grader.grade.Grader;
import com.ftchub.grader.rubric.Rubric;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Entry point for the FTC grader microservice.
 *
 * Endpoints:
 *   GET  /healthz                             - warm-up ping, always 200
 *   POST /compile                             - compile + grade a submission
 *   GET  /requirements?challengeId=...        - preview the rule set for the UI
 *
 * Authentication: every non-health endpoint requires the
 *   X-Grader-Secret: $GRADER_SECRET
 * header. When GRADER_SECRET is unset (local dev) the check is bypassed and
 * a one-time warning is logged.
 */
public final class GraderServer {

    private static final Logger log = LoggerFactory.getLogger(GraderServer.class);
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new ParameterNamesModule());
    /**
     * Ceiling for one /compile request. Behaviour-tested challenges fork a JVM
     * inside this budget, and a cold free-tier container is slow to do that, so
     * the default leaves room for {@code BEHAVIOR_PROCESS_TIMEOUT_MS} (15s) plus
     * the compile itself. Tune with COMPILE_TIMEOUT_SECONDS.
     */
    private static final long COMPILE_TIMEOUT_SECONDS = envInt("COMPILE_TIMEOUT_SECONDS", 25);

    public static void main(String[] args) throws Exception {
        int port = envInt("PORT", 8080);
        String secret = System.getenv("GRADER_SECRET");
        if (secret == null || secret.isBlank()) {
            log.warn("GRADER_SECRET is not set — endpoints are unauthenticated. " +
                     "Set GRADER_SECRET in production.");
        }

        StubLoader stubs = new StubLoader();
        int compiled = stubs.compile();
        log.info("Grader ready: {} stub class(es), {} external jar(s).",
                compiled, stubs.classpathLibs().size());

        InMemoryCompiler compiler = new InMemoryCompiler(stubs);
        // The runner needs the stub bytecode too — the sandbox JVM has to
        // resolve LinearOpMode and friends to instantiate a submission.
        Grader grader = new Grader(compiler, new BehaviorRunner(stubs.compiledStubs()));
        ExecutorService pool = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "grader-worker");
            t.setDaemon(true);
            return t;
        });

        Javalin app = Javalin.create(cfg -> {
            cfg.showJavalinBanner = false;
            cfg.http.defaultContentType = "application/json";
            cfg.compression.gzipOnly(6);
        }).start("0.0.0.0", port);

        // ── /healthz ──────────────────────────────────────────────────────
        app.get("/healthz", ctx -> ctx.json(java.util.Map.of(
                "ok", true,
                "stubs", compiled,
                "libs", stubs.classpathLibs().size()
        )));

        // ── /compile ──────────────────────────────────────────────────────
        app.post("/compile", ctx -> {
            if (!authorized(ctx, secret)) return;
            CompileRequest req;
            try {
                req = MAPPER.readValue(ctx.body(), CompileRequest.class);
            } catch (Exception e) {
                ctx.status(HttpStatus.BAD_REQUEST).json(error("Malformed JSON: " + e.getMessage()));
                return;
            }
            if (req.code() == null) {
                ctx.status(HttpStatus.BAD_REQUEST).json(error("Missing `code` field."));
                return;
            }

            Future<GradedResultJson> future = pool.submit(() -> grader.grade(req));
            try {
                GradedResultJson result = future.get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                ctx.json(result);
            } catch (TimeoutException te) {
                future.cancel(true);
                ctx.status(HttpStatus.GATEWAY_TIMEOUT)
                        .json(error("Compilation took longer than " + COMPILE_TIMEOUT_SECONDS + "s — submission rejected."));
            } catch (Exception e) {
                log.error("Grader failed", e);
                ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error("Internal grader error."));
            }
        });

        // ── /requirements ─────────────────────────────────────────────────
        app.get("/requirements", ctx -> {
            if (!authorized(ctx, secret)) return;
            String idParam = ctx.queryParam("challengeId");
            int id;
            try { id = Integer.parseInt(idParam == null ? "0" : idParam); }
            catch (NumberFormatException nfe) {
                ctx.status(HttpStatus.BAD_REQUEST).json(error("challengeId must be an integer."));
                return;
            }
            // Mentor rules can also be sent via POST /requirements; for the
            // simple GET we just preview the built-in rules.
            ctx.json(Rubric.preview(id, List.of()));
        });

        app.post("/requirements", ctx -> {
            if (!authorized(ctx, secret)) return;
            RequirementsRequest req;
            try {
                req = MAPPER.readValue(ctx.body(), RequirementsRequest.class);
            } catch (IOException e) {
                ctx.status(HttpStatus.BAD_REQUEST).json(error("Malformed JSON: " + e.getMessage()));
                return;
            }
            List<MentorRuleSpec> mentor = req.mentorRules == null ? List.of() : req.mentorRules;
            ctx.json(Rubric.preview(req.challengeId, mentor));
        });

        app.exception(Exception.class, (e, ctx) -> {
            log.error("Unhandled exception", e);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error("Internal grader error."));
        });

        log.info("Grader listening on :{}", port);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutting down grader...");
            app.stop();
            pool.shutdownNow();
        }));
    }

    private static boolean authorized(Context ctx, String secret) {
        if (secret == null || secret.isBlank()) return true; // dev mode
        String supplied = ctx.header("X-Grader-Secret");
        if (secret.equals(supplied)) return true;
        ctx.status(HttpStatus.UNAUTHORIZED).json(error("Bad or missing X-Grader-Secret."));
        return false;
    }

    private static java.util.Map<String, Object> error(String msg) {
        return java.util.Map.of("error", msg);
    }

    private static int envInt(String name, int def) {
        String s = System.getenv(name);
        if (s == null || s.isBlank()) return def;
        try { return Integer.parseInt(s); } catch (NumberFormatException nfe) { return def; }
    }

    /** Wire format for POST /requirements. */
    public static final class RequirementsRequest {
        public int challengeId;
        public List<MentorRuleSpec> mentorRules;
    }
}
