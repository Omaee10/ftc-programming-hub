package com.ftchub.grader.rubric;

import com.ftchub.grader.api.MentorRuleSpec;
import com.ftchub.grader.api.RequirementPreviewJson;
import com.ftchub.grader.rubric.challenges.ChallengeRubrics;
import com.ftchub.grader.rubric.mentor.JsonRule;
import com.ftchub.grader.rubric.universal.UniversalRules;

import java.util.ArrayList;
import java.util.List;

/**
 * Single source of truth for which rules apply to a given challenge.
 *
 * The set is composed at request time as:
 *   universal rules + per-challenge rules + mentor-supplied rules
 */
public final class Rubric {

    private Rubric() {}

    public static List<RubricRule> universal() {
        return UniversalRules.ALL;
    }

    public static List<RubricRule> forChallenge(int challengeId, List<MentorRuleSpec> mentorRules) {
        List<RubricRule> all = new ArrayList<>();
        all.addAll(ChallengeRubrics.forChallenge(challengeId));
        if (mentorRules != null) {
            for (MentorRuleSpec s : mentorRules) all.add(JsonRule.from(s));
        }
        return all;
    }

    /** Preview shape used by the workspace's "Code Requirements" panel. */
    public static List<RequirementPreviewJson> preview(int challengeId, List<MentorRuleSpec> mentorRules) {
        List<RequirementPreviewJson> preview = new ArrayList<>();
        // Required-tier first (universal → challenge), then improvement-tier (universal → challenge).
        for (RubricRule r : universal()) {
            if (r.tier() == Tier.REQUIRED) preview.add(toPreview(r, "universal"));
        }
        for (RubricRule r : forChallenge(challengeId, mentorRules)) {
            if (r.tier() == Tier.REQUIRED) preview.add(toPreview(r, "challenge"));
        }
        for (RubricRule r : universal()) {
            if (r.tier() != Tier.REQUIRED) preview.add(toPreview(r, "universal"));
        }
        for (RubricRule r : forChallenge(challengeId, mentorRules)) {
            if (r.tier() != Tier.REQUIRED) preview.add(toPreview(r, "challenge"));
        }
        return preview;
    }

    private static RequirementPreviewJson toPreview(RubricRule r, String scope) {
        return new RequirementPreviewJson(r.label(), r.description(), r.tier().wire(), scope);
    }
}
