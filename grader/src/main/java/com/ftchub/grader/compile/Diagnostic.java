package com.ftchub.grader.compile;

/**
 * Friendlier rendering of a javac {@code Diagnostic}.
 *
 * kind:    "error" | "warning" | "note"
 * code:    javac code, e.g. "compiler.err.cant.resolve.location"
 * snippet: the offending source line (empty when not known)
 */
public record Diagnostic(
        String kind,
        long line,
        long column,
        String code,
        String message,
        String snippet
) {}
