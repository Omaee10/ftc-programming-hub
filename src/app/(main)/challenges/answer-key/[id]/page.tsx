import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById } from "@/data/challenges";
import { getChallengeSolution } from "@/data/challengeSolutions";
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
  const challenge = getChallengeById(Number(id));
  const solution = getChallengeSolution(Number(id));
  if (!challenge || !solution) notFound();
  return <AnswerKeyGuard challenge={challenge} solution={solution} />;
}
