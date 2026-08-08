import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById } from "@/data/challenges";
import { SOLUTION_IDS } from "@/data/challengeSolutions";
import AnswerKeyGuard from "../AnswerKeyGuard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const challenge = getChallengeById(Number(id));
  if (!challenge) return { title: "Answer Key Not Found" };
  return { title: `Answer Key – ${challenge.title}` };
}

export default async function AnswerKeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challengeId = Number(id);
  const challenge = getChallengeById(challengeId);

  // Existence only — importing SOLUTION_IDS (a list of numbers) keeps the real
  // solutions on the server. The solution itself is deliberately NOT resolved
  // here and NOT passed to AnswerKeyGuard: props handed to a client component
  // are serialised into the RSC payload embedded in the HTML, so doing that
  // shipped the answer to anyone who loaded the URL, guard or no guard.
  // AnswerKeyGuard fetches it from /api/mentor/answer-key instead, which
  // verifies mentor status against the database.
  if (!challenge || !SOLUTION_IDS.includes(challengeId)) notFound();

  return <AnswerKeyGuard challenge={challenge} />;
}
