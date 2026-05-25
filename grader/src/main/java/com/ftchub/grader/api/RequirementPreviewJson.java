package com.ftchub.grader.api;

/**
 * Lightweight description of a single grader check, used by the workspace's
 * "Code Requirements" panel before any code has been submitted.
 *
 * scope: "universal" — applies to every challenge
 *        "challenge" — specific to this challenge id
 */
public record RequirementPreviewJson(
        String label,
        String description,
        String tier,
        String scope
) {}
