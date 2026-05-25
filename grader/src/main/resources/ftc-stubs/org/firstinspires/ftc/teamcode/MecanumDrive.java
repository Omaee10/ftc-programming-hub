package org.firstinspires.ftc.teamcode;

import com.acmerobotics.roadrunner.Pose2d;
import com.acmerobotics.roadrunner.TrajectoryActionBuilder;
import com.qualcomm.robotcore.hardware.HardwareMap;

public class MecanumDrive {
    public Pose2d pose;
    public MecanumDrive(HardwareMap hardwareMap, Pose2d initialPose) { this.pose = initialPose; }
    public TrajectoryActionBuilder actionBuilder(Pose2d beginPose) { return new TrajectoryActionBuilder(); }
}
