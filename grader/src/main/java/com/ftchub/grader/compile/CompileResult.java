package com.ftchub.grader.compile;

import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.Trees;

import java.util.List;
import java.util.Map;

/**
 * Bundles everything the rubric engine needs to inspect a single submission:
 *  - structured diagnostics from the compiler (syntax + type errors)
 *  - the parsed AST and {@link Trees} helper, so rules can resolve types
 *  - the raw source split into lines, for snippet rendering
 *  - whether the compiler hit a fatal error
 *  - emitted bytecode, when the caller asked for it
 *
 * When parsing fails before analysis, {@code parsed} and {@code task} may be
 * null and rubric rules must defensively handle that.
 *
 * {@code classBytes} is empty unless the compile was requested with bytecode
 * emission — only behaviour-tested challenges pay for the extra codegen pass.
 * Keys are binary names ({@code org.firstinspires.ftc.teamcode.Foo$Bar}).
 */
public record CompileResult(
        List<Diagnostic> diagnostics,
        boolean hasFatalError,
        CompilationUnitTree parsed,
        JavacTask task,
        Trees trees,
        String source,
        List<String> sourceLines,
        Map<String, byte[]> classBytes,
        String mainClassName
) {}
