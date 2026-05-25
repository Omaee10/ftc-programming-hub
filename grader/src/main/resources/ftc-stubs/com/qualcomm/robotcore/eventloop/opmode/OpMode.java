package com.qualcomm.robotcore.eventloop.opmode;

import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Gamepad;
import org.firstinspires.ftc.robotcore.external.Telemetry;

public abstract class OpMode {
    public HardwareMap hardwareMap;
    public Gamepad gamepad1;
    public Gamepad gamepad2;
    public Telemetry telemetry;

    public abstract void init();
    public void init_loop() {}
    public void start() {}
    public abstract void loop();
    public void stop() {}

    public double getRuntime() { return 0.0; }
}
