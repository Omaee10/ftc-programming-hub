package com.qualcomm.hardware.limelightvision;

import com.qualcomm.robotcore.hardware.HardwareDevice;

public class Limelight3A implements HardwareDevice {
    public boolean start() { return true; }
    public boolean stop() { return true; }
    public boolean pipelineSwitch(int index) { return true; }
    public LLResult getLatestResult() { return new LLResult(); }
    public boolean isConnected() { return true; }
    public void setPollRateHz(int hz) {}

    @Override public void close() {}
    @Override public String getDeviceName() { return ""; }
    @Override public String getConnectionInfo() { return ""; }
    @Override public int getVersion() { return 0; }
    @Override public void resetDeviceConfigurationForOpMode() {}
}
