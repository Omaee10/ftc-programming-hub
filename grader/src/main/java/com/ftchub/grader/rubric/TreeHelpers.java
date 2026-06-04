package com.ftchub.grader.rubric;

import com.sun.source.tree.AnnotationTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ExpressionTree;
import com.sun.source.tree.IdentifierTree;
import com.sun.source.tree.MemberSelectTree;
import com.sun.source.tree.MethodInvocationTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.NewClassTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.Trees;

import javax.lang.model.element.Element;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeMirror;
import javax.tools.JavaFileObject;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Small toolbox of AST predicates used by many rubric rules. Everything here
 * is null-safe and tolerant of partially-compiled trees — type info may be
 * missing when the student's code didn't pass analysis, so each helper falls
 * back to a syntactic check when types aren't resolvable.
 */
public final class TreeHelpers {

    private TreeHelpers() {}

    // ── Method-invocation patterns ─────────────────────────────────────────

    /** Does the AST contain any call to {@code methodName} on a receiver of {@code typeName} (simple or FQN)? */
    public static boolean callsMethod(RubricContext ctx, String typeName, String methodName) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitMethodInvocation(MethodInvocationTree node, Void p) {
                if (seen[0]) return null;
                String called = simpleMethodName(node);
                if (methodName.equals(called)) {
                    String receiverType = receiverTypeName(ctx, node);
                    if (typeName == null || matchesType(receiverType, typeName)) {
                        seen[0] = true;
                    }
                }
                return super.visitMethodInvocation(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Convenience — any call to a method with the given name, regardless of receiver. */
    public static boolean callsMethod(RubricContext ctx, String methodName) {
        return callsMethod(ctx, null, methodName);
    }

    /** Total count of calls to a method with the given name. */
    public static int countMethodCalls(RubricContext ctx, String methodName) {
        if (!ctx.astAvailable()) return 0;
        var count = new int[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitMethodInvocation(MethodInvocationTree node, Void p) {
                if (methodName.equals(simpleMethodName(node))) count[0]++;
                return super.visitMethodInvocation(node, p);
            }
        }.scan(ctx.tree(), null);
        return count[0];
    }

    /** Does the AST instantiate {@code typeName}? Both simple and qualified names match. */
    public static boolean instantiates(RubricContext ctx, String typeName) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitNewClass(NewClassTree node, Void p) {
                String n = node.getIdentifier().toString();
                if (matchesType(n, typeName)) seen[0] = true;
                return super.visitNewClass(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Does any field/local declare a variable whose type matches? */
    public static boolean declaresField(RubricContext ctx, String typeName) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitVariable(VariableTree node, Void p) {
                Tree type = node.getType();
                if (type != null && matchesType(type.toString(), typeName)) seen[0] = true;
                return super.visitVariable(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Does the main class extend / implement {@code parentName}? */
    public static boolean extendsClass(RubricContext ctx, String parentName) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitClass(ClassTree node, Void p) {
                Tree ext = node.getExtendsClause();
                if (ext != null && matchesType(ext.toString(), parentName)) seen[0] = true;
                for (Tree impl : node.getImplementsClause()) {
                    if (matchesType(impl.toString(), parentName)) seen[0] = true;
                }
                return super.visitClass(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Does any class declaration carry the given annotation (simple name match)? */
    public static boolean hasAnnotation(RubricContext ctx, String name) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitClass(ClassTree node, Void p) {
                for (AnnotationTree a : node.getModifiers().getAnnotations()) {
                    String an = a.getAnnotationType().toString();
                    if (matchesType(an, name)) seen[0] = true;
                }
                return super.visitClass(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Method by name declared anywhere in the source (top-level methods only). */
    public static boolean declaresMethod(RubricContext ctx, String methodName) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitMethod(MethodTree node, Void p) {
                if (methodName.equals(node.getName().toString())) seen[0] = true;
                return super.visitMethod(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    // ── While-loop helpers (very common in FTC rubrics) ────────────────────

    /** Returns true if any {@code while (...)} loop body contains a call to {@code methodName}. */
    public static boolean callsMethodInsideWhileLoop(RubricContext ctx, String methodName) {
        return countMethodCallsInsideWhileLoop(ctx, methodName) > 0;
    }

    /** Count calls to {@code methodName} inside any {@code while} loop body. */
    public static int countMethodCallsInsideWhileLoop(RubricContext ctx, String methodName) {
        if (!ctx.astAvailable()) return 0;
        var count = new int[1];
        new TreeScanner<Void, Boolean>() {
            @Override public Void visitWhileLoop(WhileLoopTree node, Boolean inside) {
                return super.visitWhileLoop(node, true);
            }
            @Override public Void visitMethodInvocation(MethodInvocationTree node, Boolean inside) {
                if (Boolean.TRUE.equals(inside) && methodName.equals(simpleMethodName(node))) count[0]++;
                return super.visitMethodInvocation(node, inside);
            }
        }.scan(ctx.tree(), null);
        return count[0];
    }

    /** Telemetry output calls that require a matching update() in the same loop. */
    public static int countTelemetryOutputsInsideWhileLoop(RubricContext ctx) {
        return countMethodCallsInsideWhileLoop(ctx, "addData")
             + countMethodCallsInsideWhileLoop(ctx, "addLine");
    }

    /** Returns true if any while loop's condition contains a call to {@code opModeIsActive()}. */
    public static boolean hasOpModeIsActiveWhile(RubricContext ctx) {
        if (!ctx.astAvailable()) return false;
        var seen = new boolean[1];
        new TreeScanner<Void, Void>() {
            @Override public Void visitWhileLoop(WhileLoopTree node, Void p) {
                ExpressionTree cond = node.getCondition();
                if (cond != null && cond.toString().contains("opModeIsActive")) seen[0] = true;
                return super.visitWhileLoop(node, p);
            }
        }.scan(ctx.tree(), null);
        return seen[0];
    }

    /** Returns true if a {@code new Type()} call appears inside any while loop body. */
    public static boolean instantiatesInsideWhileLoop(RubricContext ctx, String typeName) {
        if (!ctx.astAvailable()) return false;
        var hit = new boolean[1];
        new TreeScanner<Void, Boolean>() {
            @Override public Void visitWhileLoop(WhileLoopTree node, Boolean inside) {
                return super.visitWhileLoop(node, true);
            }
            @Override public Void visitNewClass(NewClassTree node, Boolean inside) {
                if (Boolean.TRUE.equals(inside) && matchesType(node.getIdentifier().toString(), typeName)) hit[0] = true;
                return super.visitNewClass(node, inside);
            }
        }.scan(ctx.tree(), null);
        return hit[0];
    }

    // ── Ordering ───────────────────────────────────────────────────────────

    /** First 1-based source line matching {@code pattern} (comments stripped). */
    public static long firstSourceLineMatching(RubricContext ctx, Pattern pattern) {
        for (int i = 0; i < ctx.sourceLines.size(); i++) {
            String line = ctx.sourceLines.get(i);
            int comment = line.indexOf("//");
            if (comment >= 0) line = line.substring(0, comment);
            if (pattern.matcher(line).find()) return i + 1L;
        }
        return -1;
    }

    /** Returns the starting line of the first {@code setMode(...RUN_TO_POSITION...)} call, or -1. */
    public static long firstRunToPositionSetModeLine(RubricContext ctx) {
        if (!ctx.astAvailable()) return -1;
        var line = new long[]{-1};
        new TreeScanner<Void, Void>() {
            @Override public Void visitMethodInvocation(MethodInvocationTree node, Void p) {
                if (line[0] != -1) return null;
                if (!"setMode".equals(simpleMethodName(node))) return super.visitMethodInvocation(node, p);
                for (ExpressionTree arg : node.getArguments()) {
                    if (arg.toString().contains("RUN_TO_POSITION")) {
                        long start = ctx.trees().getSourcePositions().getStartPosition(ctx.tree(), node);
                        if (start >= 0) line[0] = ctx.tree().getLineMap().getLineNumber(start);
                        return null;
                    }
                }
                return super.visitMethodInvocation(node, p);
            }
        }.scan(ctx.tree(), null);
        return line[0];
    }

    /** Returns the starting line of the first method call to {@code methodName}, or -1 if absent. */
    public static long firstCallLine(RubricContext ctx, String methodName) {
        if (!ctx.astAvailable()) return -1;
        var line = new long[]{-1};
        new TreeScanner<Void, Void>() {
            @Override public Void visitMethodInvocation(MethodInvocationTree node, Void p) {
                if (line[0] != -1) return null;
                if (methodName.equals(simpleMethodName(node))) {
                    line[0] = ctx.trees().getSourcePositions()
                            .getStartPosition(ctx.tree(), node);
                    line[0] = (line[0] < 0) ? -1 : ctx.tree().getLineMap().getLineNumber(line[0]);
                }
                return super.visitMethodInvocation(node, p);
            }
        }.scan(ctx.tree(), null);
        return line[0];
    }

    /** Returns the starting line of the first identifier reference to {@code name}, or -1. */
    public static long firstIdentifierLine(RubricContext ctx, String name) {
        if (!ctx.astAvailable()) return -1;
        var line = new long[]{-1};
        new TreeScanner<Void, Void>() {
            @Override public Void visitIdentifier(IdentifierTree node, Void p) {
                if (line[0] != -1) return null;
                if (name.equals(node.getName().toString())) {
                    long start = ctx.trees().getSourcePositions().getStartPosition(ctx.tree(), node);
                    if (start >= 0) line[0] = ctx.tree().getLineMap().getLineNumber(start);
                }
                return super.visitIdentifier(node, p);
            }
            @Override public Void visitMemberSelect(MemberSelectTree node, Void p) {
                if (line[0] != -1) return null;
                if (name.equals(node.getIdentifier().toString())) {
                    long start = ctx.trees().getSourcePositions().getStartPosition(ctx.tree(), node);
                    if (start >= 0) line[0] = ctx.tree().getLineMap().getLineNumber(start);
                }
                return super.visitMemberSelect(node, p);
            }
        }.scan(ctx.tree(), null);
        return line[0];
    }

    // ── Gamepad / drive helpers ────────────────────────────────────────────

    private static final Pattern GAMEPAD_AXIS_PATTERN =
            Pattern.compile("gamepad[12]\\.(?:left|right)_stick_[xy]|gamepad[12]\\.(?:left|right)_trigger");

    /**
     * Returns {@code true} when the "set-and-forget power" bug is present:
     * <ol>
     *   <li>{@code setPower()} is called inside a while loop (motor is driven in the loop)</li>
     *   <li>At least one gamepad axis field (stick / trigger) is read somewhere in the source</li>
     *   <li>No gamepad axis field is read <em>inside</em> any while loop — meaning the
     *       driver captured the stick value before the loop started and the motor
     *       never responds to subsequent input.</li>
     * </ol>
     */
    public static boolean hasSetAndForgetPower(RubricContext ctx) {
        if (!ctx.astAvailable()) return false;

        // If setPower isn't called inside the loop there's nothing to flag.
        if (countMethodCallsInsideWhileLoop(ctx, "setPower") == 0) return false;

        // If no gamepad axis appears anywhere, the check doesn't apply.
        if (!sourceContains(ctx, GAMEPAD_AXIS_PATTERN)) return false;

        boolean[] insideLoop  = {false};
        boolean[] outsideLoop = {false};

        new TreeScanner<Void, Boolean>() {
            @Override public Void visitWhileLoop(WhileLoopTree node, Boolean inside) {
                return super.visitWhileLoop(node, true);
            }
            @Override public Void visitMemberSelect(MemberSelectTree node, Boolean inside) {
                if (isStickOrTriggerAxis(node.getIdentifier().toString())) {
                    if (Boolean.TRUE.equals(inside)) insideLoop[0]  = true;
                    else                             outsideLoop[0] = true;
                }
                return super.visitMemberSelect(node, inside);
            }
        }.scan(ctx.tree(), null);

        // Bug only present when the axis is captured outside but never refreshed inside.
        return outsideLoop[0] && !insideLoop[0];
    }

    private static boolean isStickOrTriggerAxis(String fieldName) {
        return fieldName.equals("left_stick_y")  || fieldName.equals("right_stick_y")
            || fieldName.equals("left_stick_x")  || fieldName.equals("right_stick_x")
            || fieldName.equals("left_trigger")  || fieldName.equals("right_trigger");
    }

    // ── Regex fallbacks ────────────────────────────────────────────────────

    public static boolean sourceContains(RubricContext ctx, Pattern p) {
        return p.matcher(ctx.sourceNoComments).find();
    }

    /** True when the source contains the exact quoted hardware config name. */
    public static boolean usesHardwareLiteral(RubricContext ctx, String literal) {
        return sourceContains(ctx, Pattern.compile(Pattern.quote("\"" + literal + "\"")));
    }

    /**
     * True when a gamepad stick axis (e.g. {@code left_stick_y}) is negated
     * before use. Recognises the three forms students actually write:
     * <ul>
     *   <li>Direct: {@code -gamepad1.left_stick_y}</li>
     *   <li>Wrapped: {@code -(deadzone... gamepad1.left_stick_y ...)} — the
     *       shape the FTC Blocks generator emits for a negated deadzone.</li>
     *   <li>Variable alias: {@code double s = gamepad1.left_stick_y; ... -s}</li>
     * </ul>
     * Requiring a {@code (} immediately after the minus for the wrapped form
     * keeps plain subtraction (e.g. {@code a - k * stick}) from counting.
     *
     * @param axis the unqualified axis field, e.g. {@code "left_stick_y"}.
     */
    public static boolean negatesStickAxis(RubricContext ctx, String axis) {
        String src = ctx.sourceNoComments;
        String field = "gamepad1\\." + Pattern.quote(axis);

        // Direct or parenthesized-wrapper negation.
        if (Pattern.compile("-\\s*(?:" + field + "|\\([^;]*" + field + ")").matcher(src).find()) {
            return true;
        }

        // Variable-alias negation: capture a name assigned from an expression
        // that reads the axis, then look for a unary negation of that name.
        Matcher assign = Pattern.compile("(\\w+)\\s*=\\s*[^;=]*" + field).matcher(src);
        while (assign.find()) {
            String var = assign.group(1);
            if (Pattern.compile("-\\s*" + Pattern.quote(var) + "\\b").matcher(src).find()) {
                return true;
            }
        }
        return false;
    }

    public static List<Integer> lineNumbersMatching(RubricContext ctx, Pattern p) {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < ctx.sourceLines.size(); i++) {
            if (p.matcher(ctx.sourceLines.get(i)).find()) out.add(i + 1);
        }
        return out;
    }

    // ── Internal — type matching ───────────────────────────────────────────

    public static String simpleMethodName(MethodInvocationTree node) {
        ExpressionTree select = node.getMethodSelect();
        if (select instanceof IdentifierTree id) return id.getName().toString();
        if (select instanceof MemberSelectTree ms) return ms.getIdentifier().toString();
        return select.toString();
    }

    public static String receiverTypeName(RubricContext ctx, MethodInvocationTree node) {
        ExpressionTree select = node.getMethodSelect();
        if (!(select instanceof MemberSelectTree ms)) return null;
        ExpressionTree receiver = ms.getExpression();
        // Try type-aware lookup first.
        try {
            TypeMirror tm = ctx.trees().getTypeMirror(
                    com.sun.source.util.TreePath.getPath(ctx.tree(), receiver));
            if (tm != null) return tm.toString();
        } catch (Throwable ignored) { /* analysis failed — fall back */ }
        // Syntactic fallback — useful when class didn't compile.
        return receiver.toString();
    }

    /**
     * Returns true if {@code actualType} matches {@code target} either as a
     * simple name (last segment after a dot), a fully-qualified name, or a
     * suffix match. Tolerant of generics: {@code DcMotor<X>} matches DcMotor.
     */
    public static boolean matchesType(String actualType, String target) {
        if (actualType == null || target == null) return false;
        String a = stripGenerics(actualType);
        String t = stripGenerics(target);
        if (a.equals(t)) return true;
        if (a.endsWith("." + t)) return true;
        int dot = a.lastIndexOf('.');
        String simple = dot < 0 ? a : a.substring(dot + 1);
        if (simple.equals(t)) return true;
        int dot2 = t.lastIndexOf('.');
        String simpleT = dot2 < 0 ? t : t.substring(dot2 + 1);
        return simple.equals(simpleT);
    }

    private static String stripGenerics(String name) {
        int lt = name.indexOf('<');
        return lt < 0 ? name : name.substring(0, lt);
    }
}
