package com.ftchub.grader.api;

import java.util.List;

/**
 * Wire format for the grader's response. Field names mirror
 * the existing {@code GradedResult} TypeScript interface so the
 * Next.js layer can pass the JSON through with no transformation.
 */
public record GradedResultJson(
        String grade,                   // "good" | "needs-improvement" | "wrong"
        List<SyntaxIssueJson> syntaxIssues,
        List<CheckResultJson> universalResults,
        List<CheckResultJson> requiredResults,
        List<CheckResultJson> improvementResults,
        List<CheckResultJson> styleResults,
        ScoreJson score,
        VerdictJson verdict
) {
    public record SyntaxIssueJson(String message, String severity, List<Integer> lines) {}

    public record CheckResultJson(
            String label,
            String description,
            String tier,                 // "required" | "improvement" | "style"
            boolean pass,
            String tip,
            List<Integer> matchedLines
    ) {}

    public record ScoreJson(Bucket required, Bucket improvement) {
        public record Bucket(int passed, int total) {}
    }

    public record VerdictJson(String title, String subtitle) {}
}
