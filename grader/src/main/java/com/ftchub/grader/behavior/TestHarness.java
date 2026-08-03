package com.ftchub.grader.behavior;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;

import java.io.ByteArrayOutputStream;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Child-process entry point: loads a compiled student submission, invokes the
 * helper methods under test, and reports what came back.
 *
 * <h2>Why a separate JVM</h2>
 * This is the only place the grader executes student code. A submission can
 * loop forever, allocate without bound, or call {@code System.exit} — none of
 * which can be contained on a thread inside the server process now that
 * {@code Thread.stop} and {@code SecurityManager} are gone. Process isolation
 * handles all three: {@link BehaviorRunner} caps wall-clock time and kills the
 * child, and {@code -Xmx} caps memory. Nothing here needs to be defensive about
 * hostile code beyond keeping the report readable.
 *
 * <h2>Report channel</h2>
 * {@code System.out} is swapped for a sink on entry, so anything the submission
 * prints is discarded rather than corrupting the report. The report itself goes
 * to the real stdout on a single {@link HarnessWire#REPORT_MARKER}-prefixed line.
 */
public final class TestHarness {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new ParameterNamesModule());

    public static void main(String[] args) {
        // Grab the real stdout before anything can redirect it, then muzzle
        // System.out/System.err so student prints can't reach the parent.
        PrintStream realOut = new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8);
        System.setOut(new PrintStream(OutputStream.nullOutputStream(), false, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(OutputStream.nullOutputStream(), false, StandardCharsets.UTF_8));

        HarnessWire.Report report;
        try {
            byte[] stdin = readAll(System.in);
            HarnessWire.Request req = MAPPER.readValue(stdin, HarnessWire.Request.class);
            report = run(req);
        } catch (Throwable t) {
            report = new HarnessWire.Report(false, describe(t), List.of());
        }

        try {
            realOut.println(HarnessWire.REPORT_MARKER + MAPPER.writeValueAsString(report));
            realOut.flush();
        } catch (Exception e) {
            // Nothing left to report with — the parent treats silence as an
            // infrastructure failure and skips behaviour grading.
        }
        // Student code may have left non-daemon threads running.
        Runtime.getRuntime().halt(0);
    }

    private static HarnessWire.Report run(HarnessWire.Request req) {
        Map<String, byte[]> defs = new HashMap<>();
        for (Map.Entry<String, String> e : req.classes().entrySet()) {
            defs.put(e.getKey(), Base64.getDecoder().decode(e.getValue()));
        }

        Object instance;
        Class<?> clazz;
        try {
            SandboxLoader loader = new SandboxLoader(defs);
            clazz = loader.loadClass(req.mainClass());
            Constructor<?> ctor = clazz.getDeclaredConstructor();
            ctor.setAccessible(true);
            instance = ctor.newInstance();
        } catch (Throwable t) {
            return new HarnessWire.Report(false,
                    "Could not instantiate " + req.mainClass() + ": " + describe(t), List.of());
        }

        // One worker for every case, reused. A timed-out case leaves its thread
        // stuck, so the executor is abandoned wholesale at exit via halt().
        ExecutorService pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "behavior-case");
            t.setDaemon(true);
            return t;
        });

        List<HarnessWire.Outcome> outcomes = new ArrayList<>();
        boolean poolPoisoned = false;
        for (int i = 0; i < req.cases().size(); i++) {
            BehaviorCase c = req.cases().get(i);
            if (poolPoisoned) {
                // A previous case hung and still owns the only worker thread.
                outcomes.add(new HarnessWire.Outcome(i, "timeout", null,
                        "Skipped — an earlier case in this method never returned."));
                continue;
            }
            HarnessWire.Outcome outcome = runCase(pool, clazz, instance, c, i, req.perCaseTimeoutMs());
            if ("timeout".equals(outcome.status())) poolPoisoned = true;
            outcomes.add(outcome);
        }
        return new HarnessWire.Report(true, null, outcomes);
    }

    private static HarnessWire.Outcome runCase(
            ExecutorService pool, Class<?> clazz, Object instance,
            BehaviorCase c, int index, long timeoutMs
    ) {
        Method method;
        try {
            method = findMethod(clazz, c);
        } catch (NoSuchMethodException nsme) {
            return new HarnessWire.Outcome(index, "missing", null, nsme.getMessage());
        }
        method.setAccessible(true);

        Object[] argv = coerceArgs(c);
        Future<Object> future = pool.submit(() -> method.invoke(instance, argv));
        Object returned;
        try {
            returned = future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException te) {
            future.cancel(true);
            return new HarnessWire.Outcome(index, "timeout", null,
                    "Did not return within " + timeoutMs + "ms — check for an unterminated loop.");
        } catch (ExecutionException ee) {
            // Two layers to peel: ExecutionException wraps the reflective
            // InvocationTargetException, which wraps what the student threw.
            Throwable cause = ee.getCause();
            if (cause instanceof InvocationTargetException ite && ite.getCause() != null) {
                cause = ite.getCause();
            }
            return new HarnessWire.Outcome(index, "threw", null, describe(cause == null ? ee : cause));
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return new HarnessWire.Outcome(index, "timeout", null, "Interrupted before the method returned.");
        }

        return compare(c, index, returned);
    }

    private static HarnessWire.Outcome compare(BehaviorCase c, int index, Object returned) {
        if ("double[]".equals(c.returnType())) {
            if (!(returned instanceof double[] actual)) {
                return new HarnessWire.Outcome(index, "fail",
                        String.valueOf(returned),
                        "Expected a double[] return value.");
            }
            if (actual.length != c.expected().length) {
                return new HarnessWire.Outcome(index, "fail", BehaviorCase.format(actual),
                        "Expected " + c.expected().length + " values, got " + actual.length + ".");
            }
            for (int i = 0; i < actual.length; i++) {
                if (!close(actual[i], c.expected()[i], c.tolerance())) {
                    return new HarnessWire.Outcome(index, "fail", BehaviorCase.format(actual), null);
                }
            }
            return new HarnessWire.Outcome(index, "pass", BehaviorCase.format(actual), null);
        }

        if (!(returned instanceof Number n)) {
            return new HarnessWire.Outcome(index, "fail", String.valueOf(returned),
                    "Expected a numeric return value.");
        }
        double actual = n.doubleValue();
        String rendered = BehaviorCase.trim(actual);
        boolean ok = close(actual, c.expected()[0], c.tolerance());
        return new HarnessWire.Outcome(index, ok ? "pass" : "fail", rendered, null);
    }

    /**
     * Absolute comparison near zero, relative above it — an expectation of
     * 1691.056… should not demand more precision than a double can carry
     * through a different but equivalent formula.
     */
    private static boolean close(double actual, double expected, double tolerance) {
        if (Double.isNaN(expected)) return Double.isNaN(actual);
        if (Double.isNaN(actual) || Double.isInfinite(actual)) return false;
        double diff = Math.abs(actual - expected);
        if (diff <= tolerance) return true;
        double scale = Math.max(Math.abs(actual), Math.abs(expected));
        return diff <= tolerance * scale;
    }

    private static Method findMethod(Class<?> clazz, BehaviorCase c) throws NoSuchMethodException {
        Class<?>[] params = new Class<?>[c.paramTypes().length];
        for (int i = 0; i < params.length; i++) {
            params[i] = "int".equals(c.paramTypes()[i]) ? int.class : double.class;
        }
        for (Class<?> k = clazz; k != null && k != Object.class; k = k.getSuperclass()) {
            try {
                return k.getDeclaredMethod(c.method(), params);
            } catch (NoSuchMethodException ignored) {
                // keep walking up
            }
        }
        StringBuilder sig = new StringBuilder(c.method()).append('(');
        for (int i = 0; i < c.paramTypes().length; i++) {
            if (i > 0) sig.append(", ");
            sig.append(c.paramTypes()[i]);
        }
        sig.append(')');
        throw new NoSuchMethodException("No method " + sig + " found — check the name, "
                + "parameter types, and that it is declared in your OpMode class.");
    }

    private static Object[] coerceArgs(BehaviorCase c) {
        Object[] argv = new Object[c.args().length];
        for (int i = 0; i < argv.length; i++) {
            argv[i] = "int".equals(c.paramTypes()[i]) ? (Object) (int) c.args()[i] : (Object) c.args()[i];
        }
        return argv;
    }

    private static String describe(Throwable t) {
        if (t == null) return "unknown error";
        String msg = t.getMessage();
        String type = t.getClass().getSimpleName();
        return msg == null || msg.isBlank() ? type : type + ": " + msg;
    }

    private static byte[] readAll(java.io.InputStream in) throws java.io.IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return buf.toByteArray();
    }

    /**
     * Defines the submission and the FTC stubs it links against, and nothing
     * else. The platform loader is the parent, so {@code java.*} resolves but
     * the grader's own classes stay invisible to student code.
     */
    private static final class SandboxLoader extends ClassLoader {
        private final Map<String, byte[]> defs;

        SandboxLoader(Map<String, byte[]> defs) {
            super(ClassLoader.getPlatformClassLoader());
            this.defs = defs;
        }

        @Override
        protected Class<?> findClass(String name) throws ClassNotFoundException {
            byte[] bytes = defs.get(name);
            if (bytes == null) throw new ClassNotFoundException(name);
            return defineClass(name, bytes, 0, bytes.length);
        }
    }
}
