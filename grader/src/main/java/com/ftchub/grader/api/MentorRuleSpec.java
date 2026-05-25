package com.ftchub.grader.api;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Tiny JSON-friendly description of a rubric rule that a mentor can attach to
 * a custom challenge without writing any Java. The {@code kind} field selects
 * which detector to use; {@code arg} is the detector's parameter.
 *
 * Supported kinds (see {@link com.ftchub.grader.rubric.mentor.JsonRule}):
 *  - "callsMethod"          arg = "DcMotor.setDirection"   (className.method)
 *  - "declaresField"        arg = "DcMotor"                (type name)
 *  - "containsLiteral"      arg = "RUN_TO_POSITION"        (substring)
 *  - "extendsClass"         arg = "LinearOpMode"
 *  - "hasAnnotation"        arg = "TeleOp"
 *  - "instantiates"         arg = "ElapsedTime"            (constructor call)
 *  - "forbidsCall"          arg = "Thread.sleep"           (negative match)
 */
public record MentorRuleSpec(
        String kind,
        String arg,
        String label,
        String description,
        String tip,
        String tier
) {
    public MentorRuleSpec {
        if (tier == null || tier.isBlank()) tier = "required";
        if (label == null || label.isBlank()) label = kind + "(" + arg + ")";
        if (description == null) description = "";
        if (tip == null) tip = "";
    }
}
