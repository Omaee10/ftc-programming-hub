package com.ftchub.grader.rubric;

/**
 * Each rubric check is classified by tier:
 *  REQUIRED    — failure forces grade = "wrong"
 *  IMPROVEMENT — failure caps grade at "needs-improvement"
 *  STYLE       — informational only, never affects grade
 *  BEHAVIOR    — an executed test case; failure forces grade = "wrong"
 *
 * BEHAVIOR is scored alongside REQUIRED but kept separate on the wire so the
 * workspace can render "your code ran and returned the wrong number" apart from
 * "your code is missing something". Behaviour checks are not {@link RubricRule}s
 * — they come from {@link com.ftchub.grader.behavior.BehaviorSuite}.
 */
public enum Tier {
    REQUIRED,
    IMPROVEMENT,
    STYLE,
    BEHAVIOR;

    public String wire() {
        return switch (this) {
            case REQUIRED    -> "required";
            case IMPROVEMENT -> "improvement";
            case STYLE       -> "style";
            case BEHAVIOR    -> "behavior";
        };
    }
}
