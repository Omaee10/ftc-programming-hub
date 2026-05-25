package com.ftchub.grader.rubric;

import java.util.List;

/**
 * Per-rule outcome.
 *
 * matchedLines is only populated for negative-match rules (e.g. "no
 * Thread.sleep") when the forbidden pattern was found — to point the user at
 * the specific lines.
 */
public record RuleResult(boolean passed, List<Integer> matchedLines) {

    public static RuleResult ok() {
        return new RuleResult(true, List.of());
    }

    public static RuleResult fail() {
        return new RuleResult(false, List.of());
    }

    public static RuleResult fail(List<Integer> matchedLines) {
        return new RuleResult(false, matchedLines == null ? List.of() : matchedLines);
    }
}
