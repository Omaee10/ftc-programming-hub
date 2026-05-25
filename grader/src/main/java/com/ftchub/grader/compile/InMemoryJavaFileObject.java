package com.ftchub.grader.compile;

import javax.tools.SimpleJavaFileObject;
import java.net.URI;

/**
 * Source JavaFileObject backed by a String — no temp files, no disk I/O.
 * The URI uses a synthetic "mem:///" scheme so javac treats it as a unique file.
 */
public final class InMemoryJavaFileObject extends SimpleJavaFileObject {

    private final String code;

    public InMemoryJavaFileObject(String className, String code) {
        super(URI.create("mem:///" + className.replace('.', '/') + Kind.SOURCE.extension), Kind.SOURCE);
        this.code = code;
    }

    @Override
    public CharSequence getCharContent(boolean ignoreEncodingErrors) {
        return code;
    }
}
