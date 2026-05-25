package com.qualcomm.robotcore.hardware;

public interface DistanceSensor extends HardwareDevice {
    double getDistance(Object distanceUnit);
}
