package com.ftchub.grader.behavior;

import java.util.List;
import java.util.Map;

/**
 * Registry of executable behaviour tests, keyed by challenge id.
 *
 * Only challenges whose objective is a <em>pure helper method</em> appear here.
 * The AST rubric in {@code rubric/challenges/ChallengeRubrics.java} still runs
 * for every challenge and still owns everything structural ("declare motors as
 * fields", "don't re-fetch hardware in the loop"). Behaviour tests only answer
 * the one question the AST cannot: does the arithmetic actually come out right?
 *
 * <h2>Adding a challenge</h2>
 * A challenge is a candidate only if the student's answer lives in a method
 * that can be called with plain numbers and returns a plain number — no
 * hardware, no gamepad, no loop. Challenges whose math is written inline in
 * {@code runOpMode()} (23 "Simple P Controller", 34 "atan2 Turret Bearing")
 * cannot be tested this way without changing their starter code, and are
 * deliberately absent.
 *
 * <h2>Expected values</h2>
 * Expectations are exact IEEE-754 doubles computed from the same constants the
 * challenge defines, with a tolerance loose enough to absorb a different but
 * equivalent order of operations (e.g. {@code Math.hypot} vs an explicit sqrt).
 */
public final class BehaviorSuite {

    private BehaviorSuite() {}

    /** Tolerance for values in millimetres — generous, different formulas drift. */
    private static final double MM = 1e-6;
    /** Tolerance for unit-less ratios and normalized powers. */
    private static final double RATIO = 1e-9;
    /** Tolerance for angles in degrees. */
    private static final double DEG = 1e-9;

    private static final Map<Integer, List<BehaviorSpec>> SUITES = Map.of(

            // ── Challenge 18 — Mecanum Power Normalization ────────────────────
            18, List.of(new BehaviorSpec(
                    "normalize() scales powers correctly",
                    "normalize() divides all four wheel powers by the largest magnitude, but only when that magnitude exceeds 1.0.",
                    "Find the max of the four absolute values, and divide only when max > 1.0 — dividing unconditionally slows the robot down at low speeds, and clamping each wheel separately breaks the drive ratio.",
                    List.of(
                            // Under the limit: must pass through untouched.
                            BehaviorCase.d4arr("normalize",
                                    new double[]{0.5, 0.5, 0.5, 0.5},
                                    new double[]{0.5, 0.5, 0.5, 0.5}, RATIO),
                            // Over the limit: uniform scale-down preserving ratios.
                            BehaviorCase.d4arr("normalize",
                                    new double[]{2.0, 1.0, -1.0, 0.0},
                                    new double[]{1.0, 0.5, -0.5, 0.0}, RATIO),
                            BehaviorCase.d4arr("normalize",
                                    new double[]{1.5, -1.5, 0.75, -0.75},
                                    new double[]{1.0, -1.0, 0.5, -0.5}, RATIO),
                            // The max is negative — catches a missing Math.abs().
                            BehaviorCase.d4arr("normalize",
                                    new double[]{-2.0, 0.5, 0.5, 0.5},
                                    new double[]{-1.0, 0.25, 0.25, 0.25}, RATIO),
                            // All zero — catches an unguarded divide by zero.
                            BehaviorCase.d4arr("normalize",
                                    new double[]{0.0, 0.0, 0.0, 0.0},
                                    new double[]{0.0, 0.0, 0.0, 0.0}, RATIO)
                    ))),

            // ── Challenge 24 — Encoder Ticks to Degrees ───────────────────────
            24, List.of(new BehaviorSpec(
                    "ticksToDegrees() converts correctly",
                    "ticksToDegrees() maps encoder ticks to output-shaft degrees using TICKS_PER_REV (537.7) and GEAR_RATIO (2.0).",
                    "degrees = (ticks / (TICKS_PER_REV * GEAR_RATIO)) * 360 — a full output revolution is 537.7 * 2.0 = 1075.4 ticks, not 537.7.",
                    List.of(
                            BehaviorCase.i1("ticksToDegrees", 0, 0.0, DEG),
                            BehaviorCase.i1("ticksToDegrees", 1075, 359.86609633624693, DEG),
                            BehaviorCase.i1("ticksToDegrees", 537, 179.76566858843219, DEG),
                            // Negative travel must stay negative — catches a stray Math.abs().
                            BehaviorCase.i1("ticksToDegrees", -537, -179.76566858843219, DEG),
                            // Past one revolution — catches a wrap/modulo that shouldn't be there.
                            BehaviorCase.i1("ticksToDegrees", 2151, 720.06695183187651, DEG)
                    ))),

            // ── Challenge 33 — Pythagorean Distance to Goal ───────────────────
            33, List.of(new BehaviorSpec(
                    "distanceToGoal() computes the right distance",
                    "distanceToGoal(x, y) returns the straight-line distance in mm from (x, y) to the goal at (1828.8, 1828.8).",
                    "return Math.hypot(GOAL_X - x, GOAL_Y - y); — subtract in either order (the square removes the sign), but keep everything in millimetres.",
                    List.of(
                            // The shot point quoted in the instructions.
                            BehaviorCase.d2("distanceToGoal", 1181.1, 266.7, 1691.0563858133175, MM),
                            // Standing on the goal.
                            BehaviorCase.d2("distanceToGoal", 1828.8, 1828.8, 0.0, MM),
                            // Field origin — catches a hard-coded return.
                            BehaviorCase.d2("distanceToGoal", 0.0, 0.0, 2586.3137628679165, MM),
                            // Pure Y offset — catches swapped dx/dy.
                            BehaviorCase.d2("distanceToGoal", 1828.8, 0.0, 1828.8, MM)
                    ))),

            // ── Challenge 35 — Alliance Coordinate Mirror ─────────────────────
            35, List.of(new BehaviorSpec(
                    "mirrorX() reflects across the field centre",
                    "mirrorX(x) returns FIELD_MM - x, mapping a BLUE alliance X coordinate to its RED counterpart.",
                    "return FIELD_MM - x; with FIELD_MM = 144.0 * 25.4 = 3657.6. Mirroring is a subtraction, not a negation — mirrorX(0) must be 3657.6, not -0.",
                    List.of(
                            BehaviorCase.d1("mirrorX", 0.0, 3657.6, MM),
                            BehaviorCase.d1("mirrorX", 3657.6, 0.0, MM),
                            // The centre line maps to itself.
                            BehaviorCase.d1("mirrorX", 1828.8, 1828.8, MM),
                            // The BLUE shot point from the instructions.
                            BehaviorCase.d1("mirrorX", 1181.1, 2476.5, MM)
                    ))),

            // ── Challenge 36 — Degrees ↔ Radians Conversion ───────────────────
            36, List.of(
                    new BehaviorSpec(
                            "toRadians() converts degrees to radians",
                            "toRadians(deg) returns deg * PI / 180.",
                            "return degrees * Math.PI / 180.0; — multiply by PI first, then divide by 180. Integer division (180 instead of 180.0) is the usual culprit when everything comes back 0.",
                            List.of(
                                    BehaviorCase.d1("toRadians", 0.0, 0.0, DEG),
                                    BehaviorCase.d1("toRadians", 90.0, 1.5707963267948966, DEG),
                                    BehaviorCase.d1("toRadians", 180.0, 3.1415926535897931, DEG),
                                    BehaviorCase.d1("toRadians", 270.0, 4.7123889803846897, DEG),
                                    // Negative heading — catches a stray Math.abs().
                                    BehaviorCase.d1("toRadians", -90.0, -1.5707963267948966, DEG)
                            )),
                    new BehaviorSpec(
                            "toDegrees() converts radians to degrees",
                            "toDegrees(rad) returns rad * 180 / PI.",
                            "return radians * 180.0 / Math.PI; — this is the inverse of toRadians(), so the ratio is flipped. If toDegrees(toRadians(90)) isn't 90, one of the two has PI on the wrong side.",
                            List.of(
                                    BehaviorCase.d1("toDegrees", 0.0, 0.0, DEG),
                                    BehaviorCase.d1("toDegrees", 3.1415926535897931, 180.0, DEG),
                                    BehaviorCase.d1("toDegrees", 1.5707963267948966, 90.0, DEG),
                                    BehaviorCase.d1("toDegrees", 6.2831853071795862, 360.0, DEG)
                            ))
            )
    );

    /** True when this challenge has executable tests — gates the codegen + fork. */
    public static boolean has(int challengeId) {
        return SUITES.containsKey(challengeId);
    }

    public static List<BehaviorSpec> forChallenge(int challengeId) {
        return SUITES.getOrDefault(challengeId, List.of());
    }
}
