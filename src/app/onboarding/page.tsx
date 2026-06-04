"use client";

import { useRouter } from "next/navigation";
import { Trophy, ArrowRight, LogIn, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="m-auto w-full max-w-md py-16">
        {/* Brand mark */}
        <div className="mb-14 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30">
            <Sparkles className="h-4.5 w-4.5 text-rose-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-100 tracking-tight leading-none">
              FTC Programming Hub
            </p>
            <p className="text-xs text-slate-500 mt-0.5">by Team 21171</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight leading-snug">
            Let's get started 🎉
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            Learn FTC programming together, complete exciting challenges, and celebrate your progress along the way.
          </p>
        </div>

        {/* Sign in — returning users */}
        <button
          onClick={() => router.push("/signin")}
          className="group w-full flex items-center justify-between rounded-xl border border-rose-500/30 bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-700 hover:to-slate-700 px-6 py-5 text-left transition-all duration-200 focus:outline-none mb-4 hover:shadow-lg hover:border-rose-400/50"
        >
          <div className="flex items-center gap-3">
            <LogIn className="h-5 w-5 text-rose-400 group-hover:text-rose-300 transition-colors shrink-0" />
            <div>
              <p className="text-base font-medium text-slate-100 group-hover:text-white transition-colors">
                Sign in
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                Got a class or mentor code? Let's go!
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-purple-500 shrink-0">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </button>

        {/* Join new class — new students */}
        <button
          onClick={() => router.push("/join-class")}
          className="group w-full flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 px-6 py-5 text-left transition-all duration-200 focus:outline-none mb-4 hover:border-slate-600/60"
        >
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors shrink-0" />
            <div>
              <p className="text-base font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                Join a class
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                First time? Enter your class code to join the fun
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors shrink-0" />
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-800/60" />
          <span className="text-xs text-slate-500 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-800/60" />
        </div>

        {/* Create a class — mentors */}
        <button
          onClick={() => router.push("/create-class")}
          className="group w-full flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 px-6 py-5 text-left transition-all duration-200 focus:outline-none hover:border-slate-600/60"
        >
          <div>
            <p className="text-base font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
              Set up a class
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              Mentor? Build your team workspace here
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );
}
