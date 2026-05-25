package com.ftchub.grader.rubric;

import com.ftchub.grader.compile.CompileResult;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.Trees;

import java.util.List;

/**
 * Bundle of pre-computed inputs for every rubric rule. Rules should never
 * mutate this — it's shared by every rule evaluated against the same
 * submission. Source-only fields are still useful: many rules combine
 * type-aware AST traversal with a regex fallback for code that didn't
 * compile far enough to analyse.
 */
public final class RubricContext {

    public final CompileResult compile;
    public final String source;
    public final String sourceNoComments;
    public final List<String> sourceLines;

    public RubricContext(CompileResult compile, String source, String sourceNoComments) {
        this.compile = compile;
        this.source = source;
        this.sourceNoComments = sourceNoComments;
        this.sourceLines = compile.sourceLines();
    }

    public CompilationUnitTree tree() { return compile.parsed(); }
    public JavacTask task() { return compile.task(); }
    public Trees trees() { return compile.trees(); }
    public boolean astAvailable() { return compile.parsed() != null && compile.trees() != null; }
}
