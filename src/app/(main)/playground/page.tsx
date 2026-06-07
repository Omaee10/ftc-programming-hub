import type { Metadata } from "next";
import PlaygroundWorkspace from "@/components/PlaygroundWorkspace";

export const metadata: Metadata = {
  title: "Code Playground",
  description:
    "Free-form FTC code editor with Java and Blocks modes — compile-only checks, no challenge rubric.",
};

export default function PlaygroundPage() {
  return <PlaygroundWorkspace />;
}
