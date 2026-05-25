package com.ftchub.grader.compile;

import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.Trees;

import java.util.List;

/**
 * Bundles everything the rubric engine needs to inspect a single submission:
 *  - structured diagnostics from the compiler (syntax + type errors)
 *  - the parsed AST and {@link Trees} helper, so rules can resolve types
 *  - the raw source split into lines, for snippet rendering
 *  - whether the compiler hit a fatal error
 *
 * When parsing fails before analysis, {@code parsed} and {@code task} may be
 * null and rubric rules must defensively handle that.
 */
public record CompileResult(
        List<Diagnostic> diagnostics,
        boolean hasFatalError,
        CompilationUnitTree parsed,
        JavacTask task,
        Trees trees,
        String source,
        List<String> sourceLines
) {}
