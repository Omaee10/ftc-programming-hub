package com.qualcomm.robotcore.util;

public class ElapsedTime {
    public enum Resolution { SECONDS, MILLISECONDS }

    public ElapsedTime() {}
    public ElapsedTime(long startTime) {}
    public ElapsedTime(Resolution resolution) {}

    public void reset() {}
    public double time() { return 0.0; }
    public double seconds() { return 0.0; }
    public double milliseconds() { return 0.0; }
    public long nanoseconds() { return 0L; }
    public long startTime() { return 0L; }
    public String toString() { return "0"; }
}
