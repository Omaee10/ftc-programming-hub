"use client";

import { useRouter } from "next/navigation";
import { Trophy, ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-950 px-4">
      <div className="m-auto w-full max-w-md py-16">
        {/* Brand mark */}
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

        {/* Heading */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight leading-snug">
            Get started
          </h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            Learn FTC programming, complete challenges, and track your progress.
          </p>
        </div>

        {/* Sign in — returning users */}
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
                Already have a student or mentor code
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-primary shrink-0">
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>

        {/* Join new class — new students */}
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
                New student — enter your class code and name
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800/80" />
          <span className="text-xs text-slate-700 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-800/80" />
        </div>

        {/* Create a class — mentors */}
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
      </div>
    </div>
  );
}
