package com.ftchub.grader.behavior;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Arrays;

/**
 * One executable test case: call {@code method} with {@code args} and compare
 * the return value against {@code expected} within {@code tolerance}.
 *
 * Every parameter and return value in the behaviour-tested challenges is a
 * {@code double}, an {@code int}, or a {@code double[]}, so arguments and
 * expectations are both carried as plain double arrays and coerced on the way
 * in. That keeps the JSON crossing the sandbox boundary trivial.
 *
 * This record is serialized to the forked harness — keep it JSON-friendly.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BehaviorCase(
        String method,
        String[] paramTypes,   // "double" | "int", positionally matched to args
        double[] args,
        String returnType,     // "double" | "int" | "double[]"
        double[] expected,     // single-element unless returnType is "double[]"
        double tolerance,
        String display         // human-readable call, e.g. "mirrorX(0.0)"
) {

    public static BehaviorCase of(String method, String display, double tolerance,
                                  String[] paramTypes, double[] args,
                                  String returnType, double... expected) {
        return new BehaviorCase(method, paramTypes, args, returnType, expected, tolerance, display);
    }

    /** Convenience for the common {@code double f(double)} shape. */
    public static BehaviorCase d1(String method, double arg, double expected, double tolerance) {
        return of(method, method + "(" + trim(arg) + ")", tolerance,
                new String[]{"double"}, new double[]{arg}, "double", expected);
    }

    /** Convenience for {@code double f(double, double)}. */
    public static BehaviorCase d2(String method, double a, double b, double expected, double tolerance) {
        return of(method, method + "(" + trim(a) + ", " + trim(b) + ")", tolerance,
                new String[]{"double", "double"}, new double[]{a, b}, "double", expected);
    }

    /** Convenience for {@code double f(int)}. */
    public static BehaviorCase i1(String method, int arg, double expected, double tolerance) {
        return of(method, method + "(" + arg + ")", tolerance,
                new String[]{"int"}, new double[]{arg}, "double", expected);
    }

    /** Convenience for {@code double[] f(double, double, double, double)}. */
    public static BehaviorCase d4arr(String method, double[] args, double[] expected, double tolerance) {
        StringBuilder sb = new StringBuilder(method).append('(');
        for (int i = 0; i < args.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(trim(args[i]));
        }
        sb.append(')');
        return of(method, sb.toString(), tolerance,
                new String[]{"double", "double", "double", "double"}, args, "double[]", expected);
    }

    /** Renders the expected value the same way the harness renders actuals. */
    public String expectedDisplay() {
        return "double[]".equals(returnType) ? format(expected) : trim(expected[0]);
    }

    static String format(double[] values) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(trim(values[i]));
        }
        return sb.append('}').toString();
    }

    /** Drops the trailing ".0" noise so failure messages read like the source. */
    static String trim(double v) {
        if (v == Math.rint(v) && !Double.isInfinite(v) && Math.abs(v) < 1e9) {
            return String.valueOf((long) v);
        }
        String s = String.format("%.4f", v);
        // %.4f pads to a fixed width; strip the padding but keep at least one decimal.
        s = s.replaceAll("0+$", "");
        return s.endsWith(".") ? s + "0" : s;
    }

    @Override
    public String toString() {
        return display + " -> " + expectedDisplay() + " (args=" + Arrays.toString(args) + ")";
    }
}
