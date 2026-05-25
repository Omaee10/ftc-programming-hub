package com.acmerobotics.roadrunner;

public class Pose2d {
    public final double x, y, heading;
    public Pose2d(double x, double y, double heading) {
        this.x = x; this.y = y; this.heading = heading;
    }
    public Pose2d(Vector2d position, double heading) {
        this.x = position.x; this.y = position.y; this.heading = heading;
    }
    public Vector2d position() { return new Vector2d(x, y); }
    public double heading() { return heading; }
}
