package com.ftchub.grader.rubric;

/**
 * Each rubric check is classified by tier:
 *  REQUIRED    — failure forces grade = "wrong"
 *  IMPROVEMENT — failure caps grade at "needs-improvement"
 *  STYLE       — informational only, never affects grade
 */
public enum Tier {
    REQUIRED,
    IMPROVEMENT,
    STYLE;

    public String wire() {
        return switch (this) {
            case REQUIRED    -> "required";
            case IMPROVEMENT -> "improvement";
            case STYLE       -> "style";
        };
    }
}
