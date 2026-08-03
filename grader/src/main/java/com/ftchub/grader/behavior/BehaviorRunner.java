package com.ftchub.grader.behavior;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import com.ftchub.grader.compile.CompileResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Runs a challenge's {@link BehaviorSpec}s against a compiled submission in a
 * throwaway JVM, and reports which ones passed.
 *
 * <h2>Isolation</h2>
 * Student code is executed, so it gets its own process: capped heap, capped
 * wall clock, killed unconditionally when the budget runs out. An infinite
 * loop, a {@code System.exit}, or an allocation bomb costs one child process
 * and nothing else. See {@link TestHarness} for the other side.
 *
 * <h2>Failing safe</h2>
 * A distinction runs through this class: a submission that returns the wrong
 * number is the <em>student's</em> problem and fails the check, but a child
 * that never starts, never reports, or cannot load a class is <em>our</em>
 * problem and is reported as {@code ran = false} so {@link
 * com.ftchub.grader.grade.Grader} skips behaviour grading entirely rather than
 * marking correct work wrong.
 */
public final class BehaviorRunner {

    private static final Logger log = LoggerFactory.getLogger(BehaviorRunner.class);
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new ParameterNamesModule());

    /** Wall clock for one method call inside the child. */
    private static final long PER_CASE_TIMEOUT_MS = envLong("BEHAVIOR_CASE_TIMEOUT_MS", 1_000);
    /** Wall clock for the whole child process, JVM startup included. */
    private static final long PROCESS_TIMEOUT_MS = envLong("BEHAVIOR_PROCESS_TIMEOUT_MS", 15_000);
    /** Heap ceiling for the child. Plenty for arithmetic; stops allocation bombs. */
    private static final String CHILD_HEAP = envString("BEHAVIOR_CHILD_HEAP", "64m");

    private final Map<String, byte[]> stubClasses;

    public BehaviorRunner(Map<String, byte[]> stubClasses) {
        this.stubClasses = stubClasses;
    }

    /** Outcome of one {@link BehaviorSpec} — all of its cases must pass. */
    public record SpecResult(BehaviorSpec spec, boolean passed, String detail) {}

    /**
     * @param ran        false when the sandbox could not be trusted to answer;
     *                   callers must not let this affect a student's grade
     * @param skipReason why it didn't run, for logging
     */
    public record Report(boolean ran, String skipReason, List<SpecResult> results) {
        static Report skipped(String reason) { return new Report(false, reason, List.of()); }
    }

    public Report run(CompileResult compiled, List<BehaviorSpec> specs) {
        if (specs.isEmpty()) return Report.skipped("no specs for this challenge");
        if (compiled.classBytes().isEmpty()) {
            return Report.skipped("no bytecode emitted — submission did not reach codegen");
        }

        // Flatten every case across every spec into one child invocation, and
        // remember which spec each index came from.
        List<BehaviorCase> flat = new ArrayList<>();
        List<Integer> owner = new ArrayList<>();
        for (int s = 0; s < specs.size(); s++) {
            for (BehaviorCase c : specs.get(s).cases()) {
                flat.add(c);
                owner.add(s);
            }
        }

        Map<String, String> classes = new HashMap<>();
        Base64.Encoder b64 = Base64.getEncoder();
        for (Map.Entry<String, byte[]> e : stubClasses.entrySet()) {
            classes.put(e.getKey(), b64.encodeToString(e.getValue()));
        }
        // Student classes last: a submission may legitimately shadow a stub name,
        // and its own bytecode is the one that should win.
        for (Map.Entry<String, byte[]> e : compiled.classBytes().entrySet()) {
            classes.put(e.getKey(), b64.encodeToString(e.getValue()));
        }

        HarnessWire.Request request = new HarnessWire.Request(
                compiled.mainClassName(), classes, flat, PER_CASE_TIMEOUT_MS);

        HarnessWire.Report report;
        try {
            report = invokeChild(request);
        } catch (Exception e) {
            log.warn("Behaviour sandbox failed to run — skipping behaviour grading", e);
            return Report.skipped("sandbox error: " + e.getMessage());
        }
        if (report == null) {
            return Report.skipped("child produced no report within " + PROCESS_TIMEOUT_MS + "ms");
        }
        if (!report.started()) {
            // The submission compiled, so failing to load it points at the
            // grader (a missing stub) far more often than at the student.
            log.warn("Behaviour sandbox could not load submission: {}", report.fatalError());
            return Report.skipped("submission would not load: " + report.fatalError());
        }

        return new Report(true, null, collate(specs, owner, flat, report.outcomes()));
    }

    /** Folds per-case outcomes back into one pass/fail per spec. */
    private static List<SpecResult> collate(
            List<BehaviorSpec> specs,
            List<Integer> owner,
            List<BehaviorCase> flat,
            List<HarnessWire.Outcome> outcomes
    ) {
        Map<Integer, HarnessWire.Outcome> byIndex = new HashMap<>();
        for (HarnessWire.Outcome o : outcomes) byIndex.put(o.index(), o);

        List<SpecResult> results = new ArrayList<>();
        for (int s = 0; s < specs.size(); s++) {
            BehaviorSpec spec = specs.get(s);
            String detail = null;
            boolean passed = true;
            int passedCases = 0;
            int totalCases = 0;

            for (int i = 0; i < flat.size(); i++) {
                if (owner.get(i) != s) continue;
                totalCases++;
                HarnessWire.Outcome o = byIndex.get(i);
                if (o != null && o.passed()) {
                    passedCases++;
                    continue;
                }
                passed = false;
                // Report only the first failing case — a wall of failures from
                // one root cause teaches less than one worked example.
                if (detail == null) detail = describe(flat.get(i), o);
            }
            if (passed) {
                detail = passedCases + "/" + totalCases + " cases passed";
            }
            results.add(new SpecResult(spec, passed, detail));
        }
        return results;
    }

    private static String describe(BehaviorCase c, HarnessWire.Outcome o) {
        if (o == null) {
            return c.display() + " was never reported by the sandbox";
        }
        return switch (o.status()) {
            case "missing" -> o.message();
            case "timeout" -> c.display() + " — " + o.message();
            case "threw"   -> c.display() + " threw " + o.message();
            default -> {
                String base = c.display() + " returned " + o.actual()
                        + ", expected " + c.expectedDisplay();
                yield o.message() == null ? base : base + " (" + o.message() + ")";
            }
        };
    }

    /** Forks the harness, pipes the request in, and reads the report back out. */
    private HarnessWire.Report invokeChild(HarnessWire.Request request) throws Exception {
        String java = System.getProperty("java.home") + File.separator + "bin" + File.separator + "java";
        List<String> cmd = List.of(
                java,
                "-Xmx" + CHILD_HEAP,
                "-Xss512k",
                "-XX:+UseSerialGC",
                "-XX:TieredStopAtLevel=1",       // student math is never hot; skip C2 warm-up
                "-Djava.awt.headless=true",
                "-cp", System.getProperty("java.class.path"),
                TestHarness.class.getName()
        );

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(false);
        Process child = pb.start();

        byte[] payload = MAPPER.writeValueAsBytes(request);
        // Feed stdin on a separate thread: a child that dies early would
        // otherwise deadlock the write against a full, unread pipe.
        Thread feeder = new Thread(() -> {
            try (OutputStream out = child.getOutputStream()) {
                out.write(payload);
                out.flush();
            } catch (Exception ignored) {
                // Child exited before reading — the empty report path handles it.
            }
        }, "behavior-stdin");
        feeder.setDaemon(true);
        feeder.start();

        StringBuilder stdout = new StringBuilder();
        Thread reader = new Thread(() -> {
            try (InputStream in = child.getInputStream()) {
                stdout.append(new String(readAll(in), StandardCharsets.UTF_8));
            } catch (Exception ignored) {
                // Partial output still gets scanned for a report line below.
            }
        }, "behavior-stdout");
        reader.setDaemon(true);
        reader.start();

        // Drain stderr so a chatty child can't block on a full pipe.
        Thread errSink = new Thread(() -> {
            try (InputStream in = child.getErrorStream()) {
                readAll(in);
            } catch (Exception ignored) {
                // nothing to do
            }
        }, "behavior-stderr");
        errSink.setDaemon(true);
        errSink.start();

        boolean exited = child.waitFor(PROCESS_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        if (!exited) {
            child.destroyForcibly();
            child.waitFor(2, TimeUnit.SECONDS);
        }
        reader.join(1_000);

        return parseReport(stdout.toString());
    }

    /** Pulls the marked report line out of whatever the child printed. */
    private static HarnessWire.Report parseReport(String out) throws Exception {
        int marker = out.lastIndexOf(HarnessWire.REPORT_MARKER);
        if (marker < 0) return null;
        String json = out.substring(marker + HarnessWire.REPORT_MARKER.length());
        int newline = json.indexOf('\n');
        if (newline >= 0) json = json.substring(0, newline);
        return MAPPER.readValue(json.trim(), HarnessWire.Report.class);
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return buf.toByteArray();
    }

    private static long envLong(String name, long def) {
        String s = System.getenv(name);
        if (s == null || s.isBlank()) return def;
        try {
            long v = Long.parseLong(s.trim());
            return v > 0 ? v : def;
        } catch (NumberFormatException nfe) {
            return def;
        }
    }

    private static String envString(String name, String def) {
        String s = System.getenv(name);
        return s == null || s.isBlank() ? def : s.trim();
    }
}
