"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  ArrowRight,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Settings,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  clearWorkspaceSession,
  getSession,
  isSoloSession,
  setSession as persistSession,
  type Session,
} from "@/lib/auth";
import { signOutAll, getAuthUserId, fetchAuthMe } from "@/lib/authSession";
import {
  fetchWorkspacesPayload,
  sessionMatchesWorkspaces,
} from "@/lib/workspaceValidation";
import { withTimeout } from "@/lib/withTimeout";

export default function OnboardingPage() {
  const router = useRouter();
  const [hasWorkspaces, setHasWorkspaces] = useState(false);
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(true);
  const [accountType, setAccountType] = useState<"student" | "mentor" | null | "unknown">("unknown");
  const [startingSolo, setStartingSolo] = useState(false);
  const [cachedSession, setCachedSession] = useState<Session | null>(() => getSession());
  const [savedSessionValid, setSavedSessionValid] = useState(false);
  const [staleSessionNotice, setStaleSessionNotice] = useState(false);

  const showStudentSoloCard = accountType === "student" || accountType === "unknown";
  const showMentorCreateCard = accountType === "mentor" || accountType === "unknown";

  const continueToClass = async () => {
    const session = getSession();
    if (!session) return;

    if (!isSoloSession(session)) {
      const workspaces = await fetchWorkspacesPayload();
      if (!workspaces || !sessionMatchesWorkspaces(session, workspaces)) {
        clearWorkspaceSession();
        setCachedSession(null);
        setSavedSessionValid(false);
        setStaleSessionNotice(true);
        return;
      }
    }

    persistSession(session);
    router.push(session.role === "mentor" ? "/mentor/dashboard" : "/dashboard");
  };

  const startSoloPractice = async () => {
    setStartingSolo(true);
    try {
      const me = await fetchAuthMe();
      const userId = me?.userId ?? (await getAuthUserId());
      if (!userId) {
        router.push("/login");
        return;
      }

      persistSession({
        role: "student",
        id: userId,
        name: me?.displayName?.trim() || "Student",
        solo: true,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Solo practice start:", err);
    } finally {
      setStartingSolo(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const userId = await getAuthUserId();
        if (!userId) return;

        const me = await fetchAuthMe();
        if (!cancelled && me?.accountType) {
          setAccountType(me.accountType);
        } else if (!cancelled) {
          setAccountType("unknown");
        }

        const res = await withTimeout(
          fetch("/api/auth/workspaces", { credentials: "include" }),
          15_000,
          "Loading workspaces"
        );

        if (!res.ok) return;

        const data = (await res.json()) as {
          studentCount?: number;
          mentorCount?: number;
          students?: { id: string }[];
          mentors?: { id: string }[];
        };

        if (cancelled) return;

        const workspaceCount = (data.studentCount ?? 0) + (data.mentorCount ?? 0);
        setHasWorkspaces(workspaceCount > 0);

        const session = getSession();
        if (!session) {
          setCachedSession(null);
          setSavedSessionValid(false);
          return;
        }

        setCachedSession(session);

        if (isSoloSession(session)) {
          setSavedSessionValid(true);
          return;
        }

        const workspaces = {
          students: data.students ?? [],
          mentors: data.mentors ?? [],
        };
        const valid = sessionMatchesWorkspaces(session, workspaces);
        setSavedSessionValid(valid);

        if (!valid) {
          clearWorkspaceSession();
          setCachedSession(null);
          setStaleSessionNotice(true);
        }
      } catch (err) {
        console.error("Onboarding workspace check:", err);
      } finally {
        if (!cancelled) setCheckingWorkspaces(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    router.push("/login");
    router.refresh();
    void signOutAll();
  };

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <button
        type="button"
        onClick={() => router.push("/account")}
        title="Account settings"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <Settings className="h-4 w-4" />
        Account
      </button>

      <button
        type="button"
        onClick={handleSignOut}
        className="absolute top-5 right-5 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-300 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>

      <div className="m-auto w-full max-w-md py-16">
        <div className="mb-14 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60">
            <Trophy className="h-4.5 w-4.5 text-slate-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-200 tracking-tight leading-none">
              FTC Programming Hub
            </p>
            <p className="text-xs text-slate-600 mt-0.5">by Team 21171</p>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight leading-snug">
            Get started
          </h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            Learn FTC programming, complete challenges, and track your progress.
          </p>
        </div>

        {staleSessionNotice && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-sm text-amber-200/90 leading-relaxed">
              Your previous class selection is no longer linked to this account. Tap{" "}
              <strong className="font-medium">Sign in</strong> below to pick a class, or link/join
              one first.
            </p>
          </div>
        )}

        {!checkingWorkspaces && !hasWorkspaces && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-200/90 leading-relaxed space-y-2">
              <p className="font-medium text-amber-100">Your account isn&apos;t linked to a class yet.</p>
              {accountType === "student" && (
                <p>
                  Join with your mentor&apos;s <strong className="font-medium">class code</strong>,
                  or sign up with your personal <strong className="font-medium">student code</strong>{" "}
                  if your mentor added you manually.
                </p>
              )}
              {accountType === "mentor" && (
                <p>
                  Enter your personal <strong className="font-medium">mentor sign-in code</strong>{" "}
                  via Link mentor workspace, or create a new class if you&apos;re the owner.
                </p>
              )}
              {accountType === "unknown" && (
                <p>
                  Students: use <strong className="font-medium">Join new class</strong>. Mentors:
                  use <strong className="font-medium">Link mentor workspace</strong> or{" "}
                  <strong className="font-medium">Create a class</strong>.
                </p>
              )}
            </div>
          </div>
        )}

        {!checkingWorkspaces && cachedSession && savedSessionValid && (
          <button
            type="button"
            onClick={() => void continueToClass()}
            className="group w-full flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-6 py-5 text-left hover:border-emerald-500/30 hover:bg-emerald-500/12 transition-all duration-200 focus:outline-none accent-ring mb-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <LogIn className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-medium text-emerald-100 truncate">
                  Continue to{" "}
                  {cachedSession.solo
                    ? "solo practice"
                    : cachedSession.className || cachedSession.teamName || "your class"}
                </p>
                <p className="text-sm text-emerald-400/70 mt-0.5 truncate">
                  {cachedSession.solo ? "Pick up where you left off" : "Return to where you left off"}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
          </button>
        )}

        {!checkingWorkspaces && hasWorkspaces && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-500/15 bg-sky-500/8 px-4 py-3">
            <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
            <p className="text-sm text-sky-300/90 leading-relaxed">
              Your account is already linked to a class. Tap <strong className="font-medium">Sign in</strong> below —
              you don&apos;t need to link your mentor code again.
            </p>
          </div>
        )}

        <button
          onClick={() => router.push("/signin")}
          className="group w-full flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/80 px-6 py-5 text-left hover:border-slate-600/60 hover:bg-slate-800/60 transition-all duration-200 focus:outline-none accent-ring mb-4"
        >
          <div className="flex items-center gap-3">
            <LogIn className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
            <div>
              <p className="text-base font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                Sign in
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Pick a class you&apos;ve joined
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-primary shrink-0">
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>

        <button
          onClick={() => router.push("/join-class")}
          className="group w-full flex items-center justify-between rounded-xl border border-slate-800/60 px-6 py-4.5 text-left hover:border-slate-700/60 hover:bg-slate-900/40 transition-all duration-200 focus:outline-none accent-ring mb-4"
        >
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                Join new class
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                Student — enter your mentor&apos;s class code
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
        </button>

        <button
          onClick={() => router.push("/link-mentor")}
          className="group w-full flex items-center justify-between rounded-xl border border-slate-800/60 px-6 py-4.5 text-left hover:border-slate-700/60 hover:bg-slate-900/40 transition-all duration-200 focus:outline-none accent-ring mb-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                Link mentor workspace
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                Mentor — enter your personal sign-in code
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
        </button>

        <div className="relative flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800/80" />
          <span className="text-xs text-slate-700 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-800/80" />
        </div>

        {showStudentSoloCard && (
          <button
            type="button"
            onClick={() => void startSoloPractice()}
            disabled={startingSolo}
            className="group w-full flex items-center justify-between rounded-xl border border-slate-800/60 px-6 py-4.5 text-left hover:border-slate-700/60 hover:bg-slate-900/40 transition-all duration-200 focus:outline-none accent-ring mb-4 disabled:opacity-60"
          >
            <div>
              <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                Practice on your own
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                Work through challenges solo — no class code needed
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
          </button>
        )}

        {showMentorCreateCard && (
          <button
            onClick={() => router.push("/create-class")}
            className="group w-full flex items-center justify-between rounded-xl border border-slate-800/60 px-6 py-4.5 text-left hover:border-slate-700/60 hover:bg-slate-900/40 transition-all duration-200 focus:outline-none accent-ring"
          >
            <div>
              <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                Create a class
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                For mentors — set up your team workspace
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
