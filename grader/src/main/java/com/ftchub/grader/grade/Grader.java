package com.ftchub.grader.grade;

import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.compile.CompileResult;
import com.ftchub.grader.compile.Diagnostic;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.rubric.Rubric;
import com.ftchub.grader.rubric.RubricContext;
import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.RuleResult;
import com.ftchub.grader.rubric.Tier;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Threads a single submission through the compiler and rule engine, then
 * assembles the {@link GradedResultJson} the workspace UI consumes.
 */
public final class Grader {

    private final InMemoryCompiler compiler;
    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*[\\s\\S]*?\\*/");
    private static final Pattern LINE_COMMENT  = Pattern.compile("//[^\\n]*");

    public Grader(InMemoryCompiler compiler) {
        this.compiler = compiler;
    }

    public GradedResultJson grade(CompileRequest req) {
        String source = req.code() == null ? "" : req.code();
        CompileResult cr = compiler.compile(source);
        RubricContext ctx = new RubricContext(cr, source, stripComments(source));

        List<RubricRule> universal = Rubric.universal();
        List<RubricRule> challenge = Rubric.forChallenge(req.challengeId(), req.mentorRules());

        List<GradedResultJson.CheckResultJson> universalResults  = runAll(ctx, universal);
        List<GradedResultJson.CheckResultJson> requiredResults   = runFiltered(ctx, challenge, Tier.REQUIRED);
        List<GradedResultJson.CheckResultJson> improvementResults= runFiltered(ctx, challenge, Tier.IMPROVEMENT);
        List<GradedResultJson.CheckResultJson> styleResults      = runFiltered(ctx, challenge, Tier.STYLE);

        boolean fatalSyntax = cr.hasFatalError();
        boolean universalRequiredPassed = allPassed(universalResults, "required");
        boolean universalSoftPassed     = allNonRequiredPassed(universalResults);
        boolean requiredPassed          = allPassed(requiredResults, null);
        boolean improvementPassed       = allPassed(improvementResults, null);

        String grade;
        if (fatalSyntax || !universalRequiredPassed || !requiredPassed) grade = "wrong";
        else if (!universalSoftPassed || !improvementPassed)            grade = "needs-improvement";
        else                                                            grade = "good";

        GradedResultJson.ScoreJson score = new GradedResultJson.ScoreJson(
                new GradedResultJson.ScoreJson.Bucket(
                        countPassed(universalResults, "required") + countPassed(requiredResults, null),
                        countTier(universalResults, "required") + requiredResults.size()
                ),
                new GradedResultJson.ScoreJson.Bucket(
                        countPassedNonRequired(universalResults) + countPassed(improvementResults, null),
                        countNonRequired(universalResults) + improvementResults.size()
                )
        );

        return new GradedResultJson(
                grade,
                toSyntaxJson(cr.diagnostics()),
                universalResults,
                requiredResults,
                improvementResults,
                styleResults,
                score,
                Verdict.build(grade, score, failedRequired(universalResults, requiredResults),
                              failedImprovements(universalResults, improvementResults))
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static List<GradedResultJson.CheckResultJson> runAll(RubricContext ctx, List<RubricRule> rules) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (RubricRule r : rules) out.add(toJson(r, r.check(ctx)));
        return out;
    }

    private static List<GradedResultJson.CheckResultJson> runFiltered(RubricContext ctx, List<RubricRule> rules, Tier tier) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (RubricRule r : rules) {
            if (r.tier() == tier) out.add(toJson(r, r.check(ctx)));
        }
        return out;
    }

    private static GradedResultJson.CheckResultJson toJson(RubricRule r, RuleResult result) {
        return new GradedResultJson.CheckResultJson(
                r.label(),
                r.description(),
                r.tier().wire(),
                result.passed(),
                r.tip(),
                result.matchedLines()
        );
    }

    private static boolean allPassed(List<GradedResultJson.CheckResultJson> rs, String tierFilter) {
        for (var r : rs) {
            if (tierFilter != null && !tierFilter.equals(r.tier())) continue;
            if (!r.pass()) return false;
        }
        return true;
    }

    private static boolean allNonRequiredPassed(List<GradedResultJson.CheckResultJson> rs) {
        for (var r : rs) if (!"required".equals(r.tier()) && !r.pass()) return false;
        return true;
    }

    private static int countTier(List<GradedResultJson.CheckResultJson> rs, String tier) {
        int n = 0;
        for (var r : rs) if (tier.equals(r.tier())) n++;
        return n;
    }
    private static int countNonRequired(List<GradedResultJson.CheckResultJson> rs) {
        int n = 0;
        for (var r : rs) if (!"required".equals(r.tier())) n++;
        return n;
    }
    private static int countPassed(List<GradedResultJson.CheckResultJson> rs, String tier) {
        int n = 0;
        for (var r : rs) {
            if (tier != null && !tier.equals(r.tier())) continue;
            if (r.pass()) n++;
        }
        return n;
    }
    private static int countPassedNonRequired(List<GradedResultJson.CheckResultJson> rs) {
        int n = 0;
        for (var r : rs) if (!"required".equals(r.tier()) && r.pass()) n++;
        return n;
    }

    private static List<GradedResultJson.CheckResultJson> failedRequired(
            List<GradedResultJson.CheckResultJson> uni,
            List<GradedResultJson.CheckResultJson> chal
    ) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (var r : uni)  if (!r.pass() && "required".equals(r.tier())) out.add(r);
        for (var r : chal) if (!r.pass()) out.add(r);
        return out;
    }

    private static List<GradedResultJson.CheckResultJson> failedImprovements(
            List<GradedResultJson.CheckResultJson> uni,
            List<GradedResultJson.CheckResultJson> improvement
    ) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (var r : uni)        if (!r.pass() && !"required".equals(r.tier())) out.add(r);
        for (var r : improvement) if (!r.pass()) out.add(r);
        return out;
    }

    private static List<GradedResultJson.SyntaxIssueJson> toSyntaxJson(List<Diagnostic> diagnostics) {
        List<GradedResultJson.SyntaxIssueJson> out = new ArrayList<>();
        for (Diagnostic d : diagnostics) {
            // "note" diagnostics are usually too noisy for students; drop them.
            if ("note".equals(d.kind())) continue;
            String severity = "warning".equals(d.kind()) ? "warning" : "error";
            String message = d.snippet().isBlank()
                    ? d.message()
                    : d.message() + "  ➜  " + d.snippet().trim();
            List<Integer> lines = d.line() > 0 ? List.of((int) d.line()) : List.of();
            out.add(new GradedResultJson.SyntaxIssueJson(message, severity, lines));
        }
        return out;
    }

    private static String stripComments(String source) {
        String noBlock = BLOCK_COMMENT.matcher(source).replaceAll(" ");
        return LINE_COMMENT.matcher(noBlock).replaceAll("");
    }
}
