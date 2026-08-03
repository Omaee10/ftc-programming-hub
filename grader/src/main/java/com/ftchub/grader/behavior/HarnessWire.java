package com.ftchub.grader.behavior;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/**
 * JSON shapes exchanged with the forked {@link TestHarness} over stdin/stdout.
 *
 * The harness runs in a separate JVM with no shared state, so everything it
 * needs — the compiled submission, the FTC stub classes it links against, and
 * the cases to run — is serialized across in one payload.
 */
public final class HarnessWire {

    private HarnessWire() {}

    /**
     * Marks the report line on the child's stdout. Student code can print
     * whatever it likes; the parent takes the last marked line and ignores the
     * rest.
     */
    public static final String REPORT_MARKER = "<<<FTC-GRADER-BEHAVIOR>>>";

    /** Parent → child. {@code classes} maps binary name to base64 bytecode. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Request(
            String mainClass,
            Map<String, String> classes,
            List<BehaviorCase> cases,
            long perCaseTimeoutMs
    ) {}

    /** Child → parent. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Report(
            boolean started,      // false when the submission could not even be loaded
            String fatalError,    // set when started == false
            List<Outcome> outcomes
    ) {}

    /**
     * Per-case result.
     *
     * status:
     *   "pass"    — returned the expected value
     *   "fail"    — ran, returned something else ({@code actual} is set)
     *   "missing" — no such method with that signature
     *   "timeout" — the method did not return in time
     *   "threw"   — the method threw ({@code message} carries the exception)
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Outcome(
            int index,
            String status,
            String actual,
            String message
    ) {
        public boolean passed() { return "pass".equals(status); }
    }
}
