import type { Metadata } from "next";
import HomeworkClient from "./HomeworkClient";

export const metadata: Metadata = {
  title: "Coding Homework",
};

export default function HomeworkPage() {
  return <HomeworkClient />;
}
