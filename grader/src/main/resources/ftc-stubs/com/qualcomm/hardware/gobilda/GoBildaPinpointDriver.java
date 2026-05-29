package com.qualcomm.hardware.gobilda;

import com.qualcomm.robotcore.hardware.HardwareDevice;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;
import org.firstinspires.ftc.robotcore.external.navigation.Pose2D;

public class GoBildaPinpointDriver implements HardwareDevice {

    public enum GoBildaOdometryPods {
        goBILDA_4_BAR_POD
    }

    public enum EncoderDirection {
        FORWARD,
        REVERSED
    }

    public void setOffsets(double xMm, double yMm) {}
    public void setEncoderResolution(GoBildaOdometryPods pods) {}
    public void setEncoderDirections(EncoderDirection forward, EncoderDirection strafe) {}
    public void resetPosAndIMU() {}
    public void update() {}
    public Pose2D getPosition() { return new Pose2D(DistanceUnit.MM, 0, 0, AngleUnit.DEGREES, 0); }
    public void setPosition(Pose2D pose) {}

    @Override public void close() {}
    @Override public String getDeviceName() { return ""; }
    @Override public String getConnectionInfo() { return ""; }
    @Override public int getVersion() { return 0; }
    @Override public void resetDeviceConfigurationForOpMode() {}
}
