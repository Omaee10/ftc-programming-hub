package com.qualcomm.robotcore.hardware;

public interface IMU extends HardwareDevice {
    boolean initialize(Object parameters);
    void resetYaw();

    class Parameters {
        public Parameters(Object orientation) {}
    }
}
