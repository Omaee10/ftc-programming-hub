package com.pedropathing.pathgen;

public class PathBuilder {
    public PathBuilder() {}
    public PathBuilder addPath(Object pathOrCurve) { return this; }
    public PathBuilder setLinearHeadingInterpolation(double from, double to) { return this; }
    public PathBuilder setConstantHeadingInterpolation(double heading) { return this; }
    public PathBuilder setTangentHeadingInterpolation() { return this; }
    public PathBuilder setReversed(boolean reversed) { return this; }
    public PathChain build() { return new PathChain(); }
}
