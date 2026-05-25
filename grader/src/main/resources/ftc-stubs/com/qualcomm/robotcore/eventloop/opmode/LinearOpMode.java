package com.qualcomm.robotcore.eventloop.opmode;

import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Gamepad;
import org.firstinspires.ftc.robotcore.external.Telemetry;

public abstract class LinearOpMode {
    public HardwareMap hardwareMap;
    public Gamepad gamepad1;
    public Gamepad gamepad2;
    public Telemetry telemetry;

    public abstract void runOpMode() throws InterruptedException;

    public void waitForStart() {}
    public boolean opModeIsActive() { return true; }
    public boolean opModeInInit() { return false; }
    public boolean isStarted() { return true; }
    public boolean isStopRequested() { return false; }
    public void sleep(long millis) {}
    public void idle() {}
    public void requestOpModeStop() {}
    public double getRuntime() { return 0.0; }
}
