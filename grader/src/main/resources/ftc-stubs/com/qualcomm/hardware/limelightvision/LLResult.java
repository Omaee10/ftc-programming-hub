package com.qualcomm.hardware.limelightvision;

import java.util.Collections;
import java.util.List;

public class LLResult {
    public boolean isValid() { return false; }
    public double getTx() { return 0; }
    public double getTy() { return 0; }
    public double getTa() { return 0; }
    public double getCaptureLatency() { return 0; }
    public double getTargetingLatency() { return 0; }
    public double getTimestamp() { return 0; }
    public int getPipelineIndex() { return 0; }
    public double[] getPythonOutput() { return null; }

    public Object getBotpose() { return null; }
    public Object getBotpose_MT2() { return null; }

    public List<LLResultTypes.FiducialResult> getFiducialResults() {
        return Collections.emptyList();
    }

    public List<LLResultTypes.ColorResult> getColorResults() {
        return Collections.emptyList();
    }

    public List<LLResultTypes.DetectorResult> getDetectorResults() {
        return Collections.emptyList();
    }

    public List<LLResultTypes.ClassifierResult> getClassifierResults() {
        return Collections.emptyList();
    }
}
