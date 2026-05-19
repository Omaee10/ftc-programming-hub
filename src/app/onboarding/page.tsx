"use client";

import { useRouter } from "next/navigation";
import { Trophy, Users, PlusCircle } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            FTC Programming Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Get started by joining an existing class or creating a new one
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex w-full max-w-2xl flex-col gap-5 sm:flex-row sm:gap-6">
        {/* Join */}
        <button
          onClick={() => router.push("/signin")}
          className="group flex flex-1 flex-col items-center gap-5 rounded-2xl border border-violet-500/20 bg-slate-900 p-8 text-center transition-all hover:border-violet-500/40 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 transition-all group-hover:bg-violet-500/20">
            <Users className="h-7 w-7 text-violet-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-slate-100">
              Join an Existing Class
            </h2>
            <p className="text-sm text-slate-500">
              Enter your access code to join a class your mentor set up
            </p>
          </div>
          <span className="mt-auto inline-flex items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-400 transition-all group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600">
            Join Class
          </span>
        </button>

        {/* Divider */}
        <div className="flex items-center justify-center sm:hidden">
          <div className="h-px w-16 bg-slate-800" />
          <span className="mx-3 text-xs text-slate-600">or</span>
          <div className="h-px w-16 bg-slate-800" />
        </div>
        <div className="hidden items-center justify-center sm:flex">
          <div className="h-24 w-px bg-slate-800" />
        </div>

        {/* Create */}
        <button
          onClick={() => router.push("/create-class")}
          className="group flex flex-1 flex-col items-center gap-5 rounded-2xl border border-amber-500/20 bg-slate-900 p-8 text-center transition-all hover:border-amber-500/40 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-all group-hover:bg-amber-500/20">
            <PlusCircle className="h-7 w-7 text-amber-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold text-slate-100">
              Create a New Class
            </h2>
            <p className="text-sm text-slate-500">
              Set up a new class and get your mentor access code
            </p>
          </div>
          <span className="mt-auto inline-flex items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-400 transition-all group-hover:bg-amber-500 group-hover:text-slate-900 group-hover:border-amber-500">
            Create Class
          </span>
        </button>
      </div>
    </div>
  );
}
