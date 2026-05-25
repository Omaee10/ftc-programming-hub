package com.qualcomm.robotcore.hardware;

public class Gamepad {
    public float left_stick_x;
    public float left_stick_y;
    public float right_stick_x;
    public float right_stick_y;
    public float left_trigger;
    public float right_trigger;
    public boolean a, b, x, y;
    public boolean dpad_up, dpad_down, dpad_left, dpad_right;
    public boolean left_bumper, right_bumper;
    public boolean back, start, guide;
    public boolean left_stick_button, right_stick_button;
    public boolean touchpad;
    public float touchpad_finger_1_x, touchpad_finger_1_y;
    public boolean touchpad_finger_1, touchpad_finger_2;

    public void rumble(double rumble1, double rumble2, int durationMs) {}
    public void rumble(int durationMs) {}
    public void rumbleBlips(int count) {}
    public void stopRumble() {}
    public boolean isRumbling() { return false; }
}
