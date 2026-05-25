package com.ftchub.grader.grade;

import com.ftchub.grader.api.GradedResultJson;

import java.util.List;

/** Builds the friendly title/subtitle copy shown at the bottom of the console. */
public final class Verdict {

    private Verdict() {}

    public static GradedResultJson.VerdictJson build(
            String grade,
            GradedResultJson.ScoreJson score,
            List<GradedResultJson.CheckResultJson> failedRequired,
            List<GradedResultJson.CheckResultJson> failedImprovements
    ) {
        return switch (grade) {
            case "good" -> new GradedResultJson.VerdictJson(
                    "Challenge Passed!",
                    "All " + score.required().total() + " required checks passed" +
                            (score.improvement().total() > 0
                                    ? " and " + score.improvement().total() + " best-practice checks passed."
                                    : ".") +
                            " XP awarded — great work!"
            );
            case "needs-improvement" -> new GradedResultJson.VerdictJson(
                    "Works — But Could Be Better",
                    "Core logic is correct, but " + failedImprovements.size() +
                            " improvement suggestion" + (failedImprovements.size() == 1 ? "" : "s") +
                            " " + (failedImprovements.size() == 1 ? "was" : "were") +
                            " not addressed. Fix the ⚠ hints to reach \"Good\"."
            );
            default -> new GradedResultJson.VerdictJson(
                    "Not Quite Right",
                    failedRequired.size() + " required check" + (failedRequired.size() == 1 ? "" : "s") +
                            " failed. Review the ✗ errors above and re-submit."
            );
        };
    }
}
