"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  Shield,
  UserPlus,
  Settings,
} from "lucide-react";
import { clearSession, setSession } from "@/lib/auth";
import { getAuthUserId, getProfileDisplayName } from "@/lib/authSession";
import { withTimeout } from "@/lib/withTimeout";

interface StudentEnrollment {
  kind: "student";
  id: string;
  name: string;
  mentorId: string;
  teamName: string;
  className?: string;
}

interface MentorWorkspace {
  kind: "mentor";
  id: string;
  name: string;
  teamName: string;
  className?: string;
  parentMentorId?: string;
  isOwner: boolean;
}

type PickerItem = StudentEnrollment | MentorWorkspace;

function mentorClassOwnerId(item: MentorWorkspace): string {
  return item.parentMentorId ?? item.id;
}

/** One card per class — prefer the row that matches the user's profile name. */
function dedupePickerItems(items: PickerItem[], profileName?: string): PickerItem[] {
  const students: StudentEnrollment[] = [];
  const seenStudentClasses = new Set<string>();
  const mentorByClass = new Map<string, MentorWorkspace>();
  const normalizedProfile = profileName?.trim().toLowerCase();

  const nameMatchesProfile = (name: string) =>
    Boolean(normalizedProfile && name.trim().toLowerCase() === normalizedProfile);

  for (const item of items) {
    if (item.kind === "student") {
      if (seenStudentClasses.has(item.mentorId)) continue;
      seenStudentClasses.add(item.mentorId);
      students.push(item);
      continue;
    }

    const classKey = mentorClassOwnerId(item);
    const existing = mentorByClass.get(classKey);
    if (!existing) {
      mentorByClass.set(classKey, item);
      continue;
    }

    const itemMatches = nameMatchesProfile(item.name);
    const existingMatches = nameMatchesProfile(existing.name);
    if (itemMatches && !existingMatches) {
      mentorByClass.set(classKey, item);
      continue;
    }
    if (existingMatches && !itemMatches) continue;

    // Prefer co-mentor slot over owner when both are linked by mistake.
    if (!item.isOwner && existing.isOwner) {
      mentorByClass.set(classKey, item);
    }
  }

  return [...students, ...mentorByClass.values()];
}

export default function SignInPage() {
  const router = useRouter();
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const enterWorkspace = useCallback(
    (item: PickerItem) => {
      startTransition(async () => {
        const userId = await getAuthUserId();
        const profileName = userId ? await getProfileDisplayName(userId) : null;

        if (item.kind === "student") {
          setSession({
            role: "student",
            id: item.id,
            name: profileName ?? item.name,
            teamName: item.teamName,
            mentorId: item.mentorId,
            ...(item.className ? { className: item.className } : {}),
          });
          router.push("/dashboard");
          return;
        }

        setSession({
          role: "mentor",
          id: item.id,
          name: profileName ?? item.name,
          teamName: item.teamName,
          ...(item.className ? { className: item.className } : {}),
          ...(item.parentMentorId ? { parentMentorId: item.parentMentorId } : {}),
        });
        router.push("/mentor/dashboard");
      });
    },
    [router]
  );

  useEffect(() => {
    clearSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
      const userId = await getAuthUserId();
      if (!userId) {
        router.replace("/login");
        return;
      }

      const profileName = (await getProfileDisplayName(userId)) ?? undefined;

      const res = await withTimeout(
        fetch("/api/auth/workspaces", { credentials: "include" }),
        15_000,
        "Loading workspaces"
      );
      const data = (await res.json()) as {
        error?: string;
        students?: StudentEnrollment[];
        mentors?: MentorWorkspace[];
      };

      if (!res.ok) {
        if (!cancelled) setError(data.error ?? "Failed to load workspaces.");
        return;
      }

      if (cancelled) return;

      const enrollments: PickerItem[] = [
        ...(data.students ?? []),
        ...(data.mentors ?? []),
      ];
      setItems(dedupePickerItems(enrollments, profileName));
      } catch (err) {
        console.error("Sign-in page load:", err);
        if (!cancelled) setError("Failed to load workspaces. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, enterWorkspace]);

  const handleSelect = (item: PickerItem) => {
    enterWorkspace(item);
  };

  if (loading || isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <button
        type="button"
        onClick={() => router.push("/onboarding")}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="m-auto w-full max-w-lg py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4 w-4 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">FTC Programming Hub</p>
            <p className="text-xs text-slate-600">Pick a class to enter</p>
          </div>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Your classes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Select a class or workspace to continue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/60 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-700/60 hover:text-slate-300 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Account
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-red-500/15 bg-red-500/8 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-8 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-slate-600 mb-4" />
            <p className="text-sm text-slate-400 mb-1">You haven&apos;t joined any classes yet</p>
            <p className="text-xs text-slate-600 mb-6">
              Join a class with your mentor&apos;s code or create a mentor workspace.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/join-class")}
                className="inline-flex items-center justify-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" />
                Join a class
              </button>
              <button
                type="button"
                onClick={() => router.push("/link-mentor")}
                className="text-sm text-slate-600 hover:text-slate-300 transition-colors"
              >
                Link a mentor or co-mentor code
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                className="group w-full flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/50 px-5 py-4 text-left hover:border-slate-600/60 hover:bg-slate-800/60 transition-all duration-200 focus:outline-none accent-ring"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
                    {item.kind === "student" ? (
                      <GraduationCap className="h-5 w-5 text-slate-400" />
                    ) : (
                      <Shield className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 truncate">
                      {item.className || item.teamName}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                      {item.kind === "student" ? item.name : item.teamName}
                      {item.kind === "mentor" && (
                        <span className="ml-2 text-slate-700">
                          · {item.isOwner ? "Owner" : "Co-mentor"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-400 shrink-0 transition-colors" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.push("/link-mentor")}
              className="mt-2 text-center text-sm text-slate-600 hover:text-slate-300 transition-colors"
            >
              Don&apos;t see your class? Link a mentor or co-mentor code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
