package com.ftchub.grader.rubric;

/**
 * A single check the grader runs against a submission. Each rule reports its
 * own label, description, tier, and a tip shown when it fails.
 *
 * Rules are stateless and shared across requests. The {@link RubricContext}
 * passed to {@link #check} contains everything a rule needs to inspect a
 * single submission (parsed AST, type info, raw source).
 */
public interface RubricRule {
    String label();
    String description();
    Tier tier();
    String tip();
    RuleResult check(RubricContext ctx);
}
