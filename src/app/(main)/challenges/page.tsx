import type { Metadata } from "next";
import ChallengesClient from "./ChallengesClient";

export const metadata: Metadata = {
  title: "Coding Challenges",
};

export default function ChallengesPage() {
  // DB challenge fetching is done client-side in ChallengesClient so that
  // filtering can be scoped to the signed-in user's mentor. Fetching here
  // (server-side, no session) would expose every team's custom challenges
  // to all students regardless of which class they belong to.
  return <ChallengesClient />;
}
