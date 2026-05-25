package com.acmerobotics.roadrunner;

public final class Actions {
    private Actions() {}
    public static void runBlocking(Action action) {}
    public static Action sequentialAction(Action... actions) { return p -> true; }
    public static Action parallelAction(Action... actions) { return p -> true; }
}
