package com.qualcomm.robotcore.hardware;

public interface DcMotorEx extends DcMotor {
    void setVelocity(double angularRate);
    double getVelocity();
    void setMotorEnable();
    void setMotorDisable();
    boolean isMotorEnabled();
    void setTargetPositionTolerance(int tolerance);
    int getTargetPositionTolerance();
    double getCurrent();
    boolean isOverCurrent();
}
