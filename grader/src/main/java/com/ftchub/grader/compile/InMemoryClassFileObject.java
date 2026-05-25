package com.ftchub.grader.compile;

import javax.tools.SimpleJavaFileObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;

/** Stores the bytecode that javac emits for a single class. */
public final class InMemoryClassFileObject extends SimpleJavaFileObject {

    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    private final String binaryName;

    public InMemoryClassFileObject(String binaryName) {
        super(URI.create("mem:///" + binaryName.replace('.', '/') + Kind.CLASS.extension), Kind.CLASS);
        this.binaryName = binaryName;
    }

    @Override
    public OutputStream openOutputStream() throws IOException {
        return buffer;
    }

    public byte[] bytes() {
        return buffer.toByteArray();
    }

    public String binaryName() {
        return binaryName;
    }
}
