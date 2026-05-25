package com.ftchub.grader.rubric.mentor;

import com.ftchub.grader.api.MentorRuleSpec;
import com.ftchub.grader.rubric.RubricContext;
import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.Rules;
import com.ftchub.grader.rubric.Tier;
import com.ftchub.grader.rubric.TreeHelpers;

import java.util.regex.Pattern;

/**
 * Adapts mentor-authored {@link MentorRuleSpec} entries into real
 * {@link RubricRule}s so a mentor can attach simple structural checks to a
 * custom challenge without writing Java.
 */
public final class JsonRule {

    private JsonRule() {}

    public static RubricRule from(MentorRuleSpec s) {
        Tier tier = parseTier(s.tier());
        String label = s.label();
        String desc = s.description();
        String tip = s.tip();

        return switch (s.kind()) {
            case "callsMethod" -> {
                // arg = "ClassName.methodName" or just "methodName"
                String[] parts = s.arg().split("\\.");
                String type = parts.length > 1 ? parts[0] : null;
                String method = parts[parts.length - 1];
                yield Rules.custom(label, desc, tip, tier,
                        ctx -> TreeHelpers.callsMethod(ctx, type, method)
                                ? com.ftchub.grader.rubric.RuleResult.ok()
                                : com.ftchub.grader.rubric.RuleResult.fail());
            }
            case "declaresField" -> Rules.custom(label, desc, tip, tier,
                    ctx -> TreeHelpers.declaresField(ctx, s.arg())
                            ? com.ftchub.grader.rubric.RuleResult.ok()
                            : com.ftchub.grader.rubric.RuleResult.fail());
            case "containsLiteral" -> {
                Pattern p = Pattern.compile(Pattern.quote(s.arg()));
                yield Rules.custom(label, desc, tip, tier,
                        ctx -> TreeHelpers.sourceContains(ctx, p)
                                ? com.ftchub.grader.rubric.RuleResult.ok()
                                : com.ftchub.grader.rubric.RuleResult.fail());
            }
            case "extendsClass" -> Rules.custom(label, desc, tip, tier,
                    ctx -> TreeHelpers.extendsClass(ctx, s.arg())
                            ? com.ftchub.grader.rubric.RuleResult.ok()
                            : com.ftchub.grader.rubric.RuleResult.fail());
            case "hasAnnotation" -> Rules.custom(label, desc, tip, tier,
                    ctx -> TreeHelpers.hasAnnotation(ctx, s.arg())
                            ? com.ftchub.grader.rubric.RuleResult.ok()
                            : com.ftchub.grader.rubric.RuleResult.fail());
            case "instantiates" -> Rules.custom(label, desc, tip, tier,
                    ctx -> TreeHelpers.instantiates(ctx, s.arg())
                            ? com.ftchub.grader.rubric.RuleResult.ok()
                            : com.ftchub.grader.rubric.RuleResult.fail());
            case "forbidsCall" -> {
                Pattern p = Pattern.compile(Pattern.quote(s.arg()) + "\\s*\\(");
                yield Rules.custom(label, desc, tip, tier, ctx -> {
                    var lines = TreeHelpers.lineNumbersMatching(ctx, p);
                    return lines.isEmpty()
                            ? com.ftchub.grader.rubric.RuleResult.ok()
                            : com.ftchub.grader.rubric.RuleResult.fail(lines);
                });
            }
            default -> Rules.custom(label, desc, tip, tier,
                    ctx -> com.ftchub.grader.rubric.RuleResult.fail());
        };
    }

    private static Tier parseTier(String s) {
        return switch (s == null ? "" : s.toLowerCase()) {
            case "improvement" -> Tier.IMPROVEMENT;
            case "style"       -> Tier.STYLE;
            default            -> Tier.REQUIRED;
        };
    }
}
