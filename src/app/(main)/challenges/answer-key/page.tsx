import type { Metadata } from "next";
import AnswerKeyClient from "./AnswerKeyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Challenge Answer Key",
};

export default function AnswerKeyPage() {
  return <AnswerKeyClient />;
}
