package com.qualcomm.robotcore.hardware;

public interface LynxModule extends HardwareDevice {
    void setBulkCachingMode(BulkCachingMode mode);
    void clearBulkCache();
}
