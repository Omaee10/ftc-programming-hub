package com.acmerobotics.roadrunner;

public class TrajectoryActionBuilder {
    public TrajectoryActionBuilder splineTo(Vector2d v, double heading) { return this; }
    public TrajectoryActionBuilder splineTo(Vector2d v, Object headingFunc) { return this; }
    public TrajectoryActionBuilder lineToX(double x) { return this; }
    public TrajectoryActionBuilder lineToY(double y) { return this; }
    public TrajectoryActionBuilder waitSeconds(double seconds) { return this; }
    public TrajectoryActionBuilder turn(double angle) { return this; }
    public TrajectoryActionBuilder strafeTo(Vector2d v) { return this; }
    public Action build() { return p -> true; }
}
