package com.ftchub.grader.compile;

import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.JavaFileObject.Kind;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Routes class output to in-memory {@link InMemoryClassFileObject} instances
 * keyed by binary name. Lets the rubric engine load the compiled student
 * code without ever touching the file system.
 */
public final class InMemoryFileManager extends ForwardingJavaFileManager<JavaFileManager> {

    private final Map<String, InMemoryClassFileObject> classes = new HashMap<>();

    public InMemoryFileManager(JavaFileManager fileManager) {
        super(fileManager);
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
            classes.put(className, cls);
            return cls;
        }
        return super.getJavaFileForOutput(location, className, kind, sibling);
    }

    public Map<String, InMemoryClassFileObject> classes() {
        return classes;
    }
}
