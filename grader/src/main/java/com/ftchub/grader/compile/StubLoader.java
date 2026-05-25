package com.ftchub.grader.compile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.jar.JarFile;
import java.util.stream.Stream;

/**
 * Loads the bundled FTC SDK source stubs (under the {@code ftc-stubs/} resource
 * directory) and compiles them once at startup. The resulting class files are
 * cached in memory and added to the classpath of every student compilation.
 *
 * If real FTC jars are present under {@code grader/libs/}, those are preferred
 * over the stubs (Gradle already places them on our classpath); the stubs only
 * fill the gap when the real SDK is unavailable.
 */
public final class StubLoader {

    private static final Logger log = LoggerFactory.getLogger(StubLoader.class);
    private static final String RESOURCE_ROOT = "ftc-stubs";

    private final Map<String, byte[]> compiledStubs = new HashMap<>();
    private final List<File> classpathLibs;

    public StubLoader() {
        this.classpathLibs = discoverLibs();
    }

    /** Returns binary-name → bytecode for every compiled stub. */
    public Map<String, byte[]> compiledStubs() {
        return Collections.unmodifiableMap(compiledStubs);
    }

    /** Real FTC SDK jars dropped into grader/libs at deploy time. */
    public List<File> classpathLibs() {
        return classpathLibs;
    }

    public int compile() throws IOException {
        List<JavaFileObject> sources = new ArrayList<>();
        for (String resource : enumerateStubResources()) {
            try (InputStream in = StubLoader.class.getClassLoader().getResourceAsStream(resource)) {
                if (in == null) continue;
                String src = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                String className = inferClassName(src, resource);
                sources.add(new InMemoryJavaFileObject(className, src));
            }
        }

        if (sources.isEmpty()) {
            log.warn("No FTC SDK stubs found on classpath — grader will only catch raw Java syntax errors.");
            return 0;
        }

        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        if (javac == null) {
            throw new IllegalStateException(
                    "No system Java compiler available — the grader image must use a JDK, not a JRE.");
        }
        StandardJavaFileManager std = javac.getStandardFileManager(null, null, StandardCharsets.UTF_8);
        InMemoryFileManager mgr = new InMemoryFileManager(std);

        boolean ok = javac.getTask(null, mgr, null,
                List.of("-proc:none", "-g:none", "-implicit:none"),
                null, sources).call();

        if (!ok) {
            throw new IllegalStateException("FTC SDK stubs failed to compile — fix the stub sources.");
        }

        for (Map.Entry<String, InMemoryClassFileObject> e : mgr.classes().entrySet()) {
            compiledStubs.put(e.getKey(), e.getValue().bytes());
        }
        log.info("Compiled {} FTC SDK stub class(es) from {} source file(s).",
                compiledStubs.size(), sources.size());
        return compiledStubs.size();
    }

    /** Walk the {@code ftc-stubs/} resource tree, handling both directories and jars. */
    private List<String> enumerateStubResources() throws IOException {
        List<String> resources = new ArrayList<>();
        Enumeration<URL> roots = StubLoader.class.getClassLoader().getResources(RESOURCE_ROOT);
        while (roots.hasMoreElements()) {
            URL root = roots.nextElement();
            String protocol = root.getProtocol();
            if ("file".equals(protocol)) {
                Path dir = Paths.get(URI.create(root.toString()));
                try (Stream<Path> walk = Files.walk(dir)) {
                    walk.filter(p -> p.toString().endsWith(".java"))
                            .forEach(p -> resources.add(RESOURCE_ROOT + "/" + dir.relativize(p).toString().replace('\\', '/')));
                }
            } else if ("jar".equals(protocol)) {
                String spec = root.toString();
                int sep = spec.indexOf("!");
                String jarPath = spec.substring("jar:file:".length(), sep);
                try (JarFile jar = new JarFile(jarPath)) {
                    jar.stream()
                            .filter(e -> e.getName().startsWith(RESOURCE_ROOT + "/") && e.getName().endsWith(".java"))
                            .forEach(e -> resources.add(e.getName()));
                }
            } else if ("jrt".equals(protocol)) {
                // module-resource — uncommon, ignore
            } else {
                // Fall back: try jar-style listing
                try (FileSystem fs = FileSystems.newFileSystem(URI.create(root.toString()),
                                                              Collections.<String, Object>emptyMap())) {
                    for (Path rootPath : fs.getRootDirectories()) {
                        try (Stream<Path> walk = Files.walk(rootPath.resolve(RESOURCE_ROOT))) {
                            walk.filter(p -> p.toString().endsWith(".java"))
                                    .forEach(p -> resources.add(rootPath.resolve(RESOURCE_ROOT).relativize(p).toString()));
                        }
                    }
                } catch (Exception ignored) { /* best effort */ }
            }
        }
        return resources;
    }

    private static String inferClassName(String src, String resource) {
        String pkg = "";
        for (String line : src.split("\n", 32)) {
            String t = line.trim();
            if (t.startsWith("package ")) {
                pkg = t.substring("package ".length()).replace(";", "").trim();
                break;
            }
        }
        String file = resource.substring(resource.lastIndexOf('/') + 1).replace(".java", "");
        return pkg.isEmpty() ? file : pkg + "." + file;
    }

    private static List<File> discoverLibs() {
        File libs = new File("libs");
        if (!libs.isDirectory()) return List.of();
        File[] jars = libs.listFiles((d, n) -> n.endsWith(".jar"));
        return jars == null ? List.of() : List.of(jars);
    }
}
