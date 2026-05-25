package org.firstinspires.ftc.teamcode;

import com.acmerobotics.roadrunner.Vector2d;

public class TrajectorySequenceBuilder {
    public TrajectorySequenceBuilder splineTo(Vector2d v, double heading) { return this; }
    public TrajectorySequenceBuilder lineTo(Vector2d v) { return this; }
    public TrajectorySequenceBuilder waitSeconds(double seconds) { return this; }
    public TrajectorySequenceBuilder addTemporalMarker(double time, Runnable r) { return this; }
    public TrajectorySequenceBuilder turn(double angle) { return this; }
    public TrajectorySequence build() { return new TrajectorySequence(); }
}
