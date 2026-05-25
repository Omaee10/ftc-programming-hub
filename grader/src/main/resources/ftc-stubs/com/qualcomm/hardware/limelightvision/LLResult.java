package com.qualcomm.hardware.limelightvision;

import java.util.Collections;
import java.util.List;

public class LLResult {
    public boolean isValid() { return false; }
    public double getTx() { return 0; }
    public double getTy() { return 0; }
    public double getTa() { return 0; }
    public List<Object> getFiducialResults() { return Collections.emptyList(); }
    public List<Object> getColorResults() { return Collections.emptyList(); }
}
