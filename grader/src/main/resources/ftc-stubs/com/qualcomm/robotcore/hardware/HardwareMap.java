package com.qualcomm.robotcore.hardware;

import java.util.Iterator;

public class HardwareMap {
    public final Object appContext = null;
    public final DeviceMapping<DcMotor> dcMotor = new DeviceMapping<>();
    public final DeviceMapping<Servo> servo = new DeviceMapping<>();

    public <T extends HardwareDevice> T get(Class<? extends T> classOrInterface, String deviceName) {
        return null;
    }
    public Object get(String deviceName) { return null; }

    public <T> T tryGet(Class<? extends T> classOrInterface, String deviceName) { return null; }

    public static class DeviceMapping<DEVICE_TYPE extends HardwareDevice> implements Iterable<DEVICE_TYPE> {
        public DEVICE_TYPE get(String deviceName) { return null; }
        public void put(String deviceName, DEVICE_TYPE device) {}
        public boolean contains(String deviceName) { return false; }
        public int size() { return 0; }
        public java.util.Set<String> keySet() { return java.util.Collections.emptySet(); }
        @Override public Iterator<DEVICE_TYPE> iterator() { return java.util.Collections.emptyIterator(); }
    }
}
