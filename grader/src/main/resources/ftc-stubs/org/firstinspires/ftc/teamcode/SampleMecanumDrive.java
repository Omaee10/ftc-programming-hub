package org.firstinspires.ftc.teamcode;

import com.acmerobotics.roadrunner.Pose2d;
import com.acmerobotics.roadrunner.TrajectoryActionBuilder;
import com.qualcomm.robotcore.hardware.HardwareMap;

public class SampleMecanumDrive {
    public SampleMecanumDrive(HardwareMap hardwareMap) {}
    public Pose2d getPoseEstimate() { return new Pose2d(0, 0, 0); }
    public void setPoseEstimate(Pose2d pose) {}
    public TrajectorySequenceBuilder trajectorySequenceBuilder(Pose2d startPose) {
        return new TrajectorySequenceBuilder();
    }
    public void followTrajectorySequence(TrajectorySequence seq) {}
    public TrajectoryActionBuilder actionBuilder(Pose2d startPose) { return new TrajectoryActionBuilder(); }
}
