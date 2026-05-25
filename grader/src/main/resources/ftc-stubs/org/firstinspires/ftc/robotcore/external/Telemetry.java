package org.firstinspires.ftc.robotcore.external;

public interface Telemetry {
    Item addData(String caption, Object value);
    Item addData(String caption, String format, Object... args);
    Line addLine();
    Line addLine(String caption);
    boolean update();
    void clear();
    void clearAll();
    void setAutoClear(boolean autoClear);
    boolean isAutoClear();
    void setMsTransmissionInterval(int msTransmissionInterval);

    interface Item {
        Item setCaption(String caption);
        Item setValue(Object value);
        Item setValue(String format, Object... args);
        String getCaption();
        Item setRetained(Boolean retained);
        Boolean isRetained();
    }

    interface Line {
        Item addData(String caption, Object value);
        Item addData(String caption, String format, Object... args);
    }
}
