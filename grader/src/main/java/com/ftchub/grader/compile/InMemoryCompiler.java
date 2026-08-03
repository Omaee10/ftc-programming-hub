package com.ftchub.grader.compile;

import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.Trees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import javax.tools.DiagnosticCollector;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Compiles a single source string in-memory using {@link JavaCompiler},
 * resolves symbols against the FTC SDK stubs (and any real jars in libs/),
 * and returns both the diagnostics and the parsed AST.
 *
 * Threading: a fresh {@link JavaCompiler} task and file-manager are created
 * per request. The shared {@link StubLoader} is immutable after startup.
 */
public final class InMemoryCompiler {

    private static final Logger log = LoggerFactory.getLogger(InMemoryCompiler.class);
    private final StubLoader stubs;
    private final String classpath;

    public InMemoryCompiler(StubLoader stubs) {
        this.stubs = stubs;
        this.classpath = buildClasspath(stubs.classpathLibs());
    }

    public CompileResult compile(String source) {
        return compile(source, false);
    }

    /**
     * @param emitBytecode when true, run codegen as well as analysis so the
     *                     behaviour runner can actually execute the submission.
     *                     Costs an extra javac phase, so callers only ask for it
     *                     on challenges that have behaviour tests.
     */
    public CompileResult compile(String source, boolean emitBytecode) {
        String className = inferClassName(source);
        InMemoryJavaFileObject src = new InMemoryJavaFileObject(className, source);

        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        if (javac == null) {
            throw new IllegalStateException(
                    "No system Java compiler — the grader image must use a JDK, not a JRE.");
        }

        DiagnosticCollector<JavaFileObject> collector = new DiagnosticCollector<>();
        StandardJavaFileManager standard = javac.getStandardFileManager(collector, Locale.US, StandardCharsets.UTF_8);
        StubBackedFileManager mgr = new StubBackedFileManager(standard, stubs.compiledStubs());

        List<String> options = new ArrayList<>(Arrays.asList(
                "-proc:none",
                "-g:none",
                "-implicit:none",
                "-Xlint:-options"
        ));
        if (!classpath.isEmpty()) {
            options.add("-classpath");
            options.add(classpath);
        }

        JavacTask task = (JavacTask) javac.getTask(
                null,
                mgr,
                collector,
                options,
                null,
                List.of(src)
        );

        CompilationUnitTree parsed = null;
        try {
            Iterable<? extends CompilationUnitTree> units = task.parse();
            for (CompilationUnitTree u : units) { parsed = u; break; }
            // analyze() may fail when there are unresolved types — we still
            // want to surface those as structured diagnostics.
            try {
                task.analyze();
            } catch (Throwable analyzeFailure) {
                log.debug("analyze() threw — student code has fatal errors", analyzeFailure);
            }
        } catch (IOException io) {
            log.warn("parse() I/O error", io);
        } catch (Throwable parseFailure) {
            log.warn("parse() threw — falling back to diagnostics only", parseFailure);
        }

        Trees trees = Trees.instance(task);

        List<Diagnostic> diagnostics = new ArrayList<>();
        boolean fatal = false;
        for (javax.tools.Diagnostic<? extends JavaFileObject> d : collector.getDiagnostics()) {
            String original = d.getMessage(Locale.US);
            String code = d.getCode();
            String friendly = MessageRewriter.rewrite(code, original);

            long line = d.getLineNumber();
            long column = d.getColumnNumber();
            String snippet = "";
            if (line > 0) {
                List<String> lines = source.lines().toList();
                if (line <= lines.size()) snippet = lines.get((int) (line - 1));
            }
            String kind = switch (d.getKind()) {
                case ERROR -> "error";
                case WARNING, MANDATORY_WARNING -> "warning";
                case NOTE, OTHER -> "note";
            };
            if ("error".equals(kind)) fatal = true;

            diagnostics.add(new Diagnostic(kind, line, column, code, friendly, snippet));
        }

        Map<String, byte[]> classBytes = emitBytecode && !fatal
                ? generateBytecode(javac, src)
                : Map.of();

        return new CompileResult(diagnostics, fatal, parsed, task, trees, source,
                source.lines().toList(), classBytes, className);
    }

    /**
     * Second, throwaway compilation whose only job is emitting class files.
     *
     * Codegen has to be a separate task: {@code JavacTask.generate()} disposes
     * the javac context, which invalidates the {@link Trees} instance the rubric
     * rules traverse with. Running it here keeps the analysis task pristine at
     * the cost of one extra pass — and only on the handful of challenges that
     * have behaviour tests.
     */
    private Map<String, byte[]> generateBytecode(JavaCompiler javac, InMemoryJavaFileObject src) {
        try {
            StandardJavaFileManager standard =
                    javac.getStandardFileManager(null, Locale.US, StandardCharsets.UTF_8);
            StubBackedFileManager mgr = new StubBackedFileManager(standard, stubs.compiledStubs());

            List<String> options = new ArrayList<>(Arrays.asList(
                    "-proc:none",
                    "-g:none",
                    "-implicit:none",
                    "-Xlint:-options"
            ));
            if (!classpath.isEmpty()) {
                options.add("-classpath");
                options.add(classpath);
            }

            boolean ok = javac.getTask(null, mgr, null, options, null, List.of(src)).call();
            if (!ok) return Map.of();

            Map<String, byte[]> out = new HashMap<>();
            for (Map.Entry<String, InMemoryClassFileObject> e : mgr.outputClasses().entrySet()) {
                byte[] bytes = e.getValue().bytes();
                if (bytes.length > 0) out.put(e.getKey(), bytes);
            }
            return out;
        } catch (Throwable t) {
            log.warn("Bytecode generation failed — behaviour tests will be skipped", t);
            return Map.of();
        }
    }

    /** Pull the public top-level class name out of the source — falls back to "Submission". */
    static String inferClassName(String source) {
        // very tolerant — works even with malformed code
        String pkg = "";
        for (String line : source.split("\n", 32)) {
            String t = line.trim();
            if (t.startsWith("package ")) {
                pkg = t.substring("package ".length()).replace(";", "").trim();
                break;
            }
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(
                "(?m)^\\s*(?:public\\s+)?(?:final\\s+|abstract\\s+)?class\\s+(\\w+)").matcher(source);
        String name = m.find() ? m.group(1) : "Submission";
        return pkg.isEmpty() ? name : pkg + "." + name;
    }

    private static String buildClasspath(List<File> libs) {
        if (libs.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < libs.size(); i++) {
            if (i > 0) sb.append(File.pathSeparator);
            sb.append(libs.get(i).getAbsolutePath());
        }
        return sb.toString();
    }
}
