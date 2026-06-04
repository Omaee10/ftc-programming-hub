package com.pedropathing.pathgen;

public class Path {
    public Path(Object curve) {}
    public Path setLinearHeadingInterpolation(double from, double to) { return this; }
    public Path setConstantHeadingInterpolation(double heading) { return this; }
    public Path setTangentHeadingInterpolation() { return this; }
    public Path setReversed(boolean reversed) { return this; }
}
