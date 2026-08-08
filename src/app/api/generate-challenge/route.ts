import { NextResponse } from "next/server";
import OpenAI from "openai";
import { applySecurityHeaders } from "@/lib/apiGuard";
import {
  GENERATE_IP_RATE,
  checkRateLimit,
  clientIdFrom,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazily instantiated so the module can be imported at build time without
// requiring OPENAI_API_KEY to be set during static analysis.
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = `You are an expert FTC (FIRST Tech Challenge) robotics programming instructor.
Given a brief description (gist) of a coding challenge, generate a complete challenge in JSON format.
Return ONLY valid JSON with no markdown fences or extra text.

The JSON must have exactly these fields:
{
  "title": "short challenge title",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "xp": number (75-300 based on difficulty),
  "tags": ["tag1", "tag2"],
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "instructions": "detailed multi-paragraph problem statement using **bold** and \`code\` markdown",
  "hints": ["hint 1", "hint 2", "hint 3"],
  "starterCode": "full Java starter code for a LinearOpMode"
}

Rules:
- instructions should be 3-4 paragraphs, detailed enough for a student to solve it
- starterCode must be valid FTC Java — a complete LinearOpMode class skeleton with TODO comments
- hints should progressively guide without giving away the full answer
- All code uses the FTC SDK (com.qualcomm.robotcore.*)`;

export async function POST(request: Request) {
  // Rate-limit per IP: these are billable upstream calls.
  const clientIp = clientIdFrom(request);
  const rate = checkRateLimit(`generate:ip:${clientIp}`, GENERATE_IP_RATE);
  if (!rate.ok) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Too many generation requests — slow down a bit." },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    );
  }

  // Require a signed-in user — this endpoint must not be a free, anonymous
  // proxy to the OpenAI API.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Sign in to generate challenges." }, { status: 401 })
    );
  }

  // Authentication was the whole check here, which left every signed-in student
  // able to spend OpenAI credit at the IP rate limit above. Only mentors author
  // challenges, so only mentors may generate them. The read runs under the
  // caller's own session, so mentors_select_own is what scopes it — a user with
  // no mentor row gets no rows back and cannot spoof one.
  const { data: mentorRows, error: mentorErr } = await supabase
    .from("mentors")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (mentorErr) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Could not verify your account." }, { status: 500 })
    );
  }

  if (!mentorRows?.length) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Only mentors can generate challenges." },
        { status: 403 }
      )
    );
  }

  try {
    const { gist, title } = (await request.json()) as {
      gist: string;
      title?: string;
    };

    if (!gist?.trim()) {
      return applySecurityHeaders(
        NextResponse.json({ error: "gist is required" }, { status: 400 })
      );
    }

    const userPrompt = title?.trim()
      ? `Title: ${title}\nGist: ${gist}`
      : `Gist: ${gist}`;

    // Bounded like every other external call in this codebase (graderClient
    // uses AbortSignal.timeout, the Supabase loaders use withTimeout). The SDK
    // default is 10 minutes, which held a serverless invocation open until the
    // platform killed it — no response, no log, just a timed-out request.
    const completion = await getOpenAI().chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      },
      { timeout: 30_000, maxRetries: 1 }
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Parsed separately from the call above so a model that returns prose or
    // truncated JSON is not reported as "Generation failed" alongside genuine
    // upstream errors — that pointed debugging at the API call when the request
    // had actually succeeded and only the response shape was wrong.
    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      console.error("generate-challenge: model returned unparseable JSON:", cleaned.slice(0, 500));
      return applySecurityHeaders(
        NextResponse.json(
          { error: "The model returned malformed JSON. Try again, or reword the gist." },
          { status: 502 }
        )
      );
    }

    return applySecurityHeaders(NextResponse.json(json));
  } catch (err) {
    console.error("generate-challenge error:", err);
    return applySecurityHeaders(
      NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 })
    );
  }
}
