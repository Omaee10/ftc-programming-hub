import type { Metadata } from "next";
import PastProgramsClient from "@/components/PastProgramsClient";

export const metadata: Metadata = {
  title: "Team Past Programs — FTC Hub",
  description:
    "Open-source archive of real competition OpModes from the 2025–2026 DECODE season — TeleOp, autonomous, vision diagnostics, and subsystem tuning programs.",
};

export default function PastProgramsPage() {
  return <PastProgramsClient />;
}
