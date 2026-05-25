package com.ftchub.grader.compile;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rewrites the cryptic standard javac error text into student-friendly
 * phrasing. The original message is always preserved as the suffix so
 * power users can still see exactly what the compiler said.
 *
 * The strategy is intentional: we match on the stable {@code compiler.err.*}
 * code rather than the English text, then format using the most useful
 * fragments extracted from the message.
 */
public final class MessageRewriter {

    private MessageRewriter() {}

    private static final Pattern CANT_RESOLVE =
            Pattern.compile("cannot find symbol\\s*\\n?\\s*symbol:\\s*(\\w+)\\s+([^\\n]+)", Pattern.DOTALL);
    private static final Pattern TYPE_MISMATCH =
            Pattern.compile("incompatible types:\\s*([^\\n]+?)\\s+cannot be converted to\\s+(.+)", Pattern.DOTALL);
    private static final Pattern MISSING_RETURN =
            Pattern.compile("missing return statement");
    private static final Pattern UNREACHABLE =
            Pattern.compile("unreachable statement");
    private static final Pattern UNCLOSED_STRING =
            Pattern.compile("unclosed string literal");
    private static final Pattern ILLEGAL_START =
            Pattern.compile("illegal start of (expression|type|statement)");

    public static String rewrite(String code, String original) {
        if (code == null) return original;
        String c = code;

        if (c.contains("cant.resolve") || c.contains("cant.resolve.location")) {
            Matcher m = CANT_RESOLVE.matcher(original);
            if (m.find()) {
                String kind = m.group(1).trim();
                String sym  = m.group(2).trim();
                return "Unknown " + kind + " `" + sym + "` — did you import the right class or misspell the name?";
            }
            return "Unknown symbol — check spelling, imports, and that the class is declared.";
        }
        if (c.contains("prob.found.req") || c.contains("type.mismatch")) {
            Matcher m = TYPE_MISMATCH.matcher(original);
            if (m.find()) {
                return "Type mismatch: expected `" + m.group(2).trim() +
                        "`, found `" + m.group(1).trim() + "` — cast or change the variable type.";
            }
            return "Type mismatch — the value's type doesn't match what the method or variable expects.";
        }
        if (c.contains("missing.ret.stmt") || MISSING_RETURN.matcher(original).find()) {
            return "Missing return statement — every code path in this method must return a value.";
        }
        if (c.contains("unreachable.stmt") || UNREACHABLE.matcher(original).find()) {
            return "Unreachable code — this statement can never run (often after a return/throw/break).";
        }
        if (c.contains("unclosed.str.lit") || UNCLOSED_STRING.matcher(original).find()) {
            return "Unclosed string literal — you're missing a closing `\"` on this line.";
        }
        if (c.contains("illegal.start") || ILLEGAL_START.matcher(original).find()) {
            return "Unexpected token — check for a missing `;`, a stray `}`, or a misplaced statement.";
        }
        if (c.contains("expected")) {
            return "Syntax error: " + original;
        }
        if (c.contains("var.might.not.have.been.initialized")) {
            return "Variable might not be initialized — assign it before reading from it.";
        }
        if (c.contains("not.stmt")) {
            return "This expression isn't a statement on its own — did you forget an assignment or method call?";
        }
        if (c.contains("does.not.override.abstract")) {
            return "This class declares an abstract method it never implements — provide the method body.";
        }
        if (c.contains("array.req.but.found")) {
            return "Tried to index a value that isn't an array. Check the variable's type.";
        }
        // Fall back to the original message — better than swallowing detail.
        return original;
    }
}
