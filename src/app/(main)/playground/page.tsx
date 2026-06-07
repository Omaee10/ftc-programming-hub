import type { Metadata } from "next";
import PlaygroundGuard from "./PlaygroundGuard";

export const metadata: Metadata = {
  title: "Code Playground",
  description:
    "Mentor sandbox for free-form FTC code — Java and Blocks modes with compile-only checks.",
};

export default function PlaygroundPage() {
  return <PlaygroundGuard />;
}
