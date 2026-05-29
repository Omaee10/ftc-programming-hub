package com.qualcomm.hardware.limelightvision;

public final class LLResultTypes {
    private LLResultTypes() {}

    public static class FiducialResult {
        public int getFiducialId() { return 0; }
        public String getFamily() { return ""; }
        public double getTargetXDegrees() { return 0; }
        public double getTargetYDegrees() { return 0; }
    }

    public static class ColorResult {
        public double getTargetXDegrees() { return 0; }
        public double getTargetYDegrees() { return 0; }
    }

    public static class DetectorResult {
        public String getClassName() { return ""; }
        public double getTargetArea() { return 0; }
    }

    public static class ClassifierResult {
        public String getClassName() { return ""; }
        public double getConfidence() { return 0; }
    }
}
