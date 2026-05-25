package com.qualcomm.robotcore.hardware;

public interface HardwareDevice {
    void close();
    String getDeviceName();
    String getConnectionInfo();
    int getVersion();
    void resetDeviceConfigurationForOpMode();
}
