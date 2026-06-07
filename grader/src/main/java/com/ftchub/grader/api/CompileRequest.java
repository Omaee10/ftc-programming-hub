package com.ftchub.grader.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Wire format for POST /compile.
 *
 * code:           student Java source as a single file
 * challengeId:    integer id of the challenge being graded
 * mentorRules:    optional rule DSL submitted by mentors who created the challenge.
 *                 When present these are layered on top of the universal rules.
 * compileOnly:    when true, run javac only — skip universal and challenge rubric checks.
 */
public record CompileRequest(
        String code,
        @JsonProperty("challengeId") int challengeId,
        @JsonProperty("mentorRules") List<MentorRuleSpec> mentorRules,
        @JsonProperty("compileOnly") boolean compileOnly
) {
    public CompileRequest {
        if (mentorRules == null) mentorRules = List.of();
    }

    /** Back-compat for callers that omit {@code compileOnly}. */
    public CompileRequest(String code, int challengeId, List<MentorRuleSpec> mentorRules) {
        this(code, challengeId, mentorRules, false);
    }
}
