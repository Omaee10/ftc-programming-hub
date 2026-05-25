package com.ftchub.grader.compile;

import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.JavaFileObject.Kind;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Extends {@link ForwardingJavaFileManager} so that:
 *  - student class output goes to in-memory {@link InMemoryClassFileObject}s,
 *  - on class lookup, we serve the pre-compiled FTC SDK stub bytecode produced
 *    once at startup by {@link StubLoader}.
 *
 * Anything we don't know about is delegated to the standard file manager
 * (which sees both the JDK classes and any real jars on the classpath).
 */
public final class StubBackedFileManager extends ForwardingJavaFileManager<JavaFileManager> {

    private final Map<String, byte[]> stubs;
    private final Map<String, InMemoryClassFileObject> outputClasses = new HashMap<>();

    public StubBackedFileManager(StandardJavaFileManager delegate, Map<String, byte[]> stubs) {
        super(delegate);
        this.stubs = stubs;
    }

    @Override
    public JavaFileObject getJavaFileForOutput(
            Location location,
            String className,
            Kind kind,
            javax.tools.FileObject sibling
    ) throws IOException {
        if (kind == Kind.CLASS) {
            InMemoryClassFileObject cls = new InMemoryClassFileObject(className);
            outputClasses.put(className, cls);
            return cls;
        }
        return super.getJavaFileForOutput(location, className, kind, sibling);
    }

    @Override
    public String inferBinaryName(Location location, JavaFileObject file) {
        if (file instanceof StubClassFileObject s) return s.binaryName;
        return super.inferBinaryName(location, file);
    }

    @Override
    public Iterable<JavaFileObject> list(
            Location location,
            String packageName,
            Set<Kind> kinds,
            boolean recurse
    ) throws IOException {
        // Inject our stub class files into the search results when javac is
        // looking for classpath entries.
        List<JavaFileObject> result = new ArrayList<>();
        if (location == javax.tools.StandardLocation.CLASS_PATH && kinds.contains(Kind.CLASS)) {
            String prefix = packageName.isEmpty() ? "" : packageName + ".";
            for (Map.Entry<String, byte[]> e : stubs.entrySet()) {
                String bn = e.getKey();
                if (recurse ? bn.startsWith(prefix) : isDirectChild(bn, packageName)) {
                    result.add(new StubClassFileObject(bn, e.getValue()));
                }
            }
        }
        for (JavaFileObject f : super.list(location, packageName, kinds, recurse)) {
            result.add(f);
        }
        return result;
    }

    public Map<String, InMemoryClassFileObject> outputClasses() {
        return outputClasses;
    }

    private static boolean isDirectChild(String binaryName, String packageName) {
        int dot = binaryName.lastIndexOf('.');
        String pkg = dot < 0 ? "" : binaryName.substring(0, dot);
        return pkg.equals(packageName);
    }

    /** In-memory representation of a previously-compiled stub class file. */
    private static final class StubClassFileObject extends SimpleJavaFileObject {
        private final String binaryName;
        private final byte[] bytes;

        StubClassFileObject(String binaryName, byte[] bytes) {
            super(URI.create("stub:///" + binaryName.replace('.', '/') + Kind.CLASS.extension), Kind.CLASS);
            this.binaryName = binaryName;
            this.bytes = bytes;
        }

        @Override public InputStream openInputStream() { return new ByteArrayInputStream(bytes); }
    }
}
