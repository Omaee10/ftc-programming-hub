package com.ftchub.grader.grade;

import com.ftchub.grader.api.CompileRequest;
import com.ftchub.grader.api.GradedResultJson;
import com.ftchub.grader.behavior.BehaviorRunner;
import com.ftchub.grader.behavior.BehaviorSpec;
import com.ftchub.grader.behavior.BehaviorSuite;
import com.ftchub.grader.compile.CompileResult;
import com.ftchub.grader.compile.Diagnostic;
import com.ftchub.grader.compile.InMemoryCompiler;
import com.ftchub.grader.rubric.Rubric;
import com.ftchub.grader.rubric.RubricContext;
import com.ftchub.grader.rubric.RubricRule;
import com.ftchub.grader.rubric.RuleResult;
import com.ftchub.grader.rubric.Tier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Threads a single submission through the compiler and rule engine, then
 * assembles the {@link GradedResultJson} the workspace UI consumes.
 *
 * Challenges listed in {@link BehaviorSuite} additionally get their helper
 * methods executed in a sandbox — see {@link BehaviorRunner}. That is the only
 * path on which student code runs; everything else is static analysis.
 */
public final class Grader {

    private static final Logger log = LoggerFactory.getLogger(Grader.class);

    private final InMemoryCompiler compiler;
    /** Null disables behaviour testing entirely (used by rubric-only tests). */
    private final BehaviorRunner behaviorRunner;

    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*[\\s\\S]*?\\*/");
    private static final Pattern LINE_COMMENT  = Pattern.compile("//[^\\n]*");
    private static final int MAX_SYNTAX_ISSUES = 10;
    private static final int MAX_MATCHED_LINES = 5;
    private static final int MAX_SNIPPET_CHARS = 80;

    /** Rubric-only grader — no student code is executed. */
    public Grader(InMemoryCompiler compiler) {
        this(compiler, null);
    }

    public Grader(InMemoryCompiler compiler, BehaviorRunner behaviorRunner) {
        this.compiler = compiler;
        this.behaviorRunner = behaviorRunner;
    }

    public GradedResultJson grade(CompileRequest req) {
        String source = req.code() == null ? "" : req.code();
        if (req.compileOnly()) {
            return compileOnly(source);
        }

        List<BehaviorSpec> specs = behaviorRunner == null
                ? List.of()
                : BehaviorSuite.forChallenge(req.challengeId());
        // Codegen only runs when there is something to execute.
        CompileResult cr = compiler.compile(source, !specs.isEmpty());
        RubricContext ctx = new RubricContext(cr, source, stripComments(source));

        List<RubricRule> universal = Rubric.universal();
        List<RubricRule> challenge = Rubric.forChallenge(req.challengeId(), req.mentorRules());

        List<GradedResultJson.CheckResultJson> universalResults  = runAll(ctx, universal);
        List<GradedResultJson.CheckResultJson> requiredResults   = runFiltered(ctx, challenge, Tier.REQUIRED);
        List<GradedResultJson.CheckResultJson> improvementResults= runFiltered(ctx, challenge, Tier.IMPROVEMENT);
        List<GradedResultJson.CheckResultJson> styleResults      = runFiltered(ctx, challenge, Tier.STYLE);
        List<GradedResultJson.CheckResultJson> behaviorResults   = runBehavior(cr, specs, req.challengeId());

        boolean fatalSyntax = cr.hasFatalError();
        boolean universalRequiredPassed = allPassed(universalResults, "required");
        boolean universalSoftPassed     = allNonRequiredPassed(universalResults);
        boolean requiredPassed          = allPassed(requiredResults, null);
        boolean improvementPassed       = allPassed(improvementResults, null);
        boolean behaviorPassed          = allPassed(behaviorResults, null);

        String grade;
        if (fatalSyntax || !universalRequiredPassed || !requiredPassed || !behaviorPassed) grade = "wrong";
        else if (!universalSoftPassed || !improvementPassed)                                grade = "needs-improvement";
        else                                                                                grade = "good";

        GradedResultJson.ScoreJson score = new GradedResultJson.ScoreJson(
                new GradedResultJson.ScoreJson.Bucket(
                        countPassed(universalResults, "required") + countPassed(requiredResults, null)
                                + countPassed(behaviorResults, null),
                        countTier(universalResults, "required") + requiredResults.size()
                                + behaviorResults.size()
                ),
                new GradedResultJson.ScoreJson.Bucket(
                        countPassedNonRequired(universalResults) + countPassed(improvementResults, null),
                        countNonRequired(universalResults) + improvementResults.size()
                )
        );

        return maybeCompact(req, new GradedResultJson(
                grade,
                toSyntaxJson(cr.diagnostics()),
                universalResults,
                requiredResults,
                improvementResults,
                styleResults,
                behaviorResults,
                score,
                Verdict.build(grade, score,
                              failedRequired(universalResults, requiredResults, behaviorResults),
                              failedImprovements(universalResults, improvementResults))
        ));
    }

    /**
     * Executes the challenge's behaviour specs, if any.
     *
     * Returns an empty list — not a failing one — whenever the sandbox could
     * not give a trustworthy answer. A grader that cannot run tests must not
     * invent failures for a student whose code is fine.
     */
    private List<GradedResultJson.CheckResultJson> runBehavior(
            CompileResult cr, List<BehaviorSpec> specs, int challengeId
    ) {
        if (specs.isEmpty() || cr.hasFatalError()) return List.of();

        BehaviorRunner.Report report = behaviorRunner.run(cr, specs);
        if (!report.ran()) {
            log.info("Behaviour tests skipped for challenge {} — {}", challengeId, report.skipReason());
            return List.of();
        }

        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (BehaviorRunner.SpecResult r : report.results()) {
            out.add(new GradedResultJson.CheckResultJson(
                    r.spec().label(),
                    r.passed() ? r.spec().description() : r.detail(),
                    Tier.BEHAVIOR.wire(),
                    r.passed(),
                    r.spec().tip(),
                    List.of()
            ));
        }
        return out;
    }

    /** Syntax + type-check only — used by the free-form Code Playground. */
    private GradedResultJson compileOnly(String source) {
        CompileResult cr = compiler.compile(source);
        boolean ok = !cr.hasFatalError();
        String grade = ok ? "good" : "wrong";
        GradedResultJson.ScoreJson score = new GradedResultJson.ScoreJson(
                new GradedResultJson.ScoreJson.Bucket(0, 0),
                new GradedResultJson.ScoreJson.Bucket(0, 0)
        );
        GradedResultJson.VerdictJson verdict = ok
                ? new GradedResultJson.VerdictJson(
                        "Compiles Successfully",
                        "No syntax or type errors found.")
                : new GradedResultJson.VerdictJson(
                        "Does Not Compile",
                        "Fix the errors above and run compile again.");
        return maybeCompact(null, new GradedResultJson(
                grade,
                toSyntaxJson(cr.diagnostics()),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                score,
                verdict
        ));
    }

    private static GradedResultJson maybeCompact(CompileRequest req, GradedResultJson full) {
        if (req != null && req.slimResponse()) {
            return compact(full);
        }
        return full;
    }

    private static GradedResultJson compact(GradedResultJson full) {
        return new GradedResultJson(
                full.grade(),
                capSyntax(full.syntaxIssues()),
                compactRequiredTier(full.universalResults()),
                compactRequiredTier(full.requiredResults()),
                compactSoftTier(full.improvementResults()),
                compactSoftTier(full.styleResults()),
                // Behaviour uses the required-tier shape: a passing check keeps
                // its label so the UI can tick it off, a failing one keeps the
                // detail explaining which case broke.
                compactRequiredTier(full.behaviorResults()),
                full.score(),
                full.verdict()
        );
    }

    private static List<GradedResultJson.CheckResultJson> compactRequiredTier(
            List<GradedResultJson.CheckResultJson> rs
    ) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (var r : rs) {
            if (r.pass()) {
                out.add(new GradedResultJson.CheckResultJson(
                        r.label(), "", r.tier(), true, null, List.of()));
            } else {
                out.add(new GradedResultJson.CheckResultJson(
                        r.label(),
                        r.description(),
                        r.tier(),
                        false,
                        r.tip(),
                        capLines(r.matchedLines())));
            }
        }
        return out;
    }

    private static List<GradedResultJson.CheckResultJson> compactSoftTier(
            List<GradedResultJson.CheckResultJson> rs
    ) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (var r : rs) {
            if (r.pass()) continue;
            out.add(new GradedResultJson.CheckResultJson(
                    r.label(),
                    r.description(),
                    r.tier(),
                    false,
                    r.tip(),
                    capLines(r.matchedLines())));
        }
        return out;
    }

    private static List<Integer> capLines(List<Integer> lines) {
        if (lines == null || lines.isEmpty()) return List.of();
        if (lines.size() <= MAX_MATCHED_LINES) return lines;
        return lines.subList(0, MAX_MATCHED_LINES);
    }

    private static List<GradedResultJson.SyntaxIssueJson> capSyntax(
            List<GradedResultJson.SyntaxIssueJson> issues
    ) {
        if (issues.size() <= MAX_SYNTAX_ISSUES) return issues;
        return issues.subList(0, MAX_SYNTAX_ISSUES);
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
            List<GradedResultJson.CheckResultJson> chal,
            List<GradedResultJson.CheckResultJson> behavior
    ) {
        List<GradedResultJson.CheckResultJson> out = new ArrayList<>();
        for (var r : uni)      if (!r.pass() && "required".equals(r.tier())) out.add(r);
        for (var r : chal)     if (!r.pass()) out.add(r);
        for (var r : behavior) if (!r.pass()) out.add(r);
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
            if ("note".equals(d.kind())) continue;
            if (out.size() >= MAX_SYNTAX_ISSUES) break;
            String severity = "warning".equals(d.kind()) ? "warning" : "error";
            String message = d.snippet().isBlank()
                    ? d.message()
                    : d.message() + "  ➜  " + truncateSnippet(d.snippet());
            List<Integer> lines = d.line() > 0 ? List.of((int) d.line()) : List.of();
            out.add(new GradedResultJson.SyntaxIssueJson(message, severity, lines));
        }
        return out;
    }

    private static String truncateSnippet(String snippet) {
        String trimmed = snippet.trim();
        if (trimmed.length() <= MAX_SNIPPET_CHARS) return trimmed;
        return trimmed.substring(0, MAX_SNIPPET_CHARS) + "…";
    }

    private static String stripComments(String source) {
        // Blank out comment text but preserve newlines so that line numbers in
        // the stripped source still line up with the original — rubric rules
        // report 1-based line numbers against this.
        String noBlock = BLOCK_COMMENT.matcher(source)
            .replaceAll(m -> m.group().replaceAll("[^\n]", " "));
        String noLine = LINE_COMMENT.matcher(noBlock).replaceAll("");
        return noLine;
    }
}
