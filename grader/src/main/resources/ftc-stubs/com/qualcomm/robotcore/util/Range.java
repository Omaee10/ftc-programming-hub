package com.qualcomm.robotcore.util;

public final class Range {
    private Range() {}
    public static double clip(double n, double min, double max) {
        return Math.max(min, Math.min(max, n));
    }
    public static int clip(int n, int min, int max) {
        return Math.max(min, Math.min(max, n));
    }
    public static float clip(float n, float min, float max) {
        return Math.max(min, Math.min(max, n));
    }
    public static double scale(double n, double xMin, double xMax, double yMin, double yMax) {
        return ((n - xMin) / (xMax - xMin)) * (yMax - yMin) + yMin;
    }
}
