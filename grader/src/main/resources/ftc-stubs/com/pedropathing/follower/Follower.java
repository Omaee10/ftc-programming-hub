package com.pedropathing.follower;

import com.pedropathing.pathgen.Pose;
import com.pedropathing.pathgen.PathChain;
import com.pedropathing.pathgen.Path;
import com.qualcomm.robotcore.hardware.HardwareMap;

public class Follower {
    public Follower(HardwareMap hardwareMap) {}
    public void setStartingPose(Pose pose) {}
    public void followPath(Path path) {}
    public void followPath(Path path, boolean holdEnd) {}
    public void followPath(PathChain chain) {}
    public void followPath(PathChain chain, boolean holdEnd) {}
    public void update() {}
    public boolean isBusy() { return false; }
    public boolean atParametricEnd() { return false; }
    public Pose getPose() { return new Pose(); }
}
