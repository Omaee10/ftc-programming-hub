package com.ftchub.grader.rubric;

import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Fluent factory for building {@link RubricRule}s without ceremony.
 *
 * Each helper takes a label, description, tip, and a predicate over the
 * {@link RubricContext}. The "absent" variants pass when the pattern is NOT
 * found, and surface the offending line numbers when it is.
 */
public final class Rules {

    private Rules() {}

    public static RubricRule required(String label, String desc, String tip, Predicate<RubricContext> ok) {
        return rule(label, desc, tip, Tier.REQUIRED, ctx -> ok.test(ctx) ? RuleResult.ok() : RuleResult.fail());
    }

    public static RubricRule improvement(String label, String desc, String tip, Predicate<RubricContext> ok) {
        return rule(label, desc, tip, Tier.IMPROVEMENT, ctx -> ok.test(ctx) ? RuleResult.ok() : RuleResult.fail());
    }

    public static RubricRule style(String label, String desc, String tip, Predicate<RubricContext> ok) {
        return rule(label, desc, tip, Tier.STYLE, ctx -> ok.test(ctx) ? RuleResult.ok() : RuleResult.fail());
    }

    /** Fails if {@code pattern} appears anywhere in the source (comments stripped). */
    public static RubricRule requiredAbsent(String label, String desc, String tip, Pattern pattern) {
        return rule(label, desc, tip, Tier.REQUIRED, ctx -> {
            var lines = TreeHelpers.lineNumbersMatching(ctx, pattern);
            return lines.isEmpty() ? RuleResult.ok() : RuleResult.fail(lines);
        });
    }

    public static RubricRule improvementAbsent(String label, String desc, String tip, Pattern pattern) {
        return rule(label, desc, tip, Tier.IMPROVEMENT, ctx -> {
            var lines = TreeHelpers.lineNumbersMatching(ctx, pattern);
            return lines.isEmpty() ? RuleResult.ok() : RuleResult.fail(lines);
        });
    }

    /** Escape hatch for rules that need the full {@link RuleResult} (e.g. with line numbers). */
    public static RubricRule custom(String label, String desc, String tip, Tier tier, Function<RubricContext, RuleResult> body) {
        return rule(label, desc, tip, tier, body);
    }

    private static RubricRule rule(String label, String desc, String tip, Tier tier, Function<RubricContext, RuleResult> body) {
        return new RubricRule() {
            @Override public String label()       { return label; }
            @Override public String description() { return desc; }
            @Override public Tier   tier()        { return tier; }
            @Override public String tip()         { return tip; }
            @Override public RuleResult check(RubricContext ctx) {
                try { return body.apply(ctx); }
                catch (Throwable t) {
                    // Rules must never crash the grader. A rule that throws is treated
                    // as a fail — the verdict copy will surface the failed label.
                    return RuleResult.fail();
                }
            }
        };
    }

    public static List<RubricRule> of(RubricRule... rs) { return List.of(rs); }
}
