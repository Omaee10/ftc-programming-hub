import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallengeById } from "@/data/challenges";
import { isBuiltinChallengeId } from "@/data/challengeMeta";
import { isCustomChallengeId } from "@/lib/classChallenges";
import ChallengeRedirectGuard from "@/components/ChallengeRedirectGuard";
import CustomChallengeLoader from "@/components/CustomChallengeLoader";

export async function generateStaticParams() {
  return Array.from({ length: 56 }, (_, i) => ({ id: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const challengeId = Number(id);

  if (isCustomChallengeId(challengeId)) {
    return { title: `Challenge ${challengeId}` };
  }

  const challenge = getChallengeById(challengeId);
  if (!challenge) return { title: "Challenge Not Found" };
  return { title: `${challenge.title} – Challenge ${challenge.id}` };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challengeId = Number(id);

  if (!Number.isFinite(challengeId)) {
    notFound();
  }

  if (isCustomChallengeId(challengeId)) {
    return <CustomChallengeLoader challengeId={challengeId} />;
  }

  if (!isBuiltinChallengeId(challengeId)) {
    notFound();
  }

  const challenge = getChallengeById(challengeId);
  if (!challenge) {
    notFound();
  }

  return <ChallengeRedirectGuard challenge={challenge} />;
}
