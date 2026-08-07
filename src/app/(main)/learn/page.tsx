import type { Metadata } from "next";
import LearnClient from "./LearnClient";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Learn Java, the FTC SDK, and robot programming theory through bite-sized documentation lessons and hands-on challenges.",
};

export default function LearnPage() {
  return <LearnClient />;
}
