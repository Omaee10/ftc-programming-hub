package com.ftchub.grader.behavior;

import java.util.List;

/**
 * One behaviour check as the student sees it: a single helper method, backed by
 * several input/output cases. All cases must pass for the check to pass.
 *
 * Multiple cases per method is what makes the check resistant to hard-coding —
 * a submission that returns the one value quoted in the challenge instructions
 * fails the remaining cases.
 */
public record BehaviorSpec(
        String label,
        String description,
        String tip,
        List<BehaviorCase> cases
) {
    /** Method under test — every case in a spec targets the same method. */
    public String method() {
        return cases.isEmpty() ? "" : cases.get(0).method();
    }
}
