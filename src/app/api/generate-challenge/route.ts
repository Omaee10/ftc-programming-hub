import { NextResponse } from "next/server";
import OpenAI from "openai";

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
  try {
    const { gist, title } = (await request.json()) as {
      gist: string;
      title?: string;
    };

    if (!gist?.trim()) {
      return NextResponse.json({ error: "gist is required" }, { status: 400 });
    }

    const userPrompt = title?.trim()
      ? `Title: ${title}\nGist: ${gist}`
      : `Gist: ${gist}`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const json = JSON.parse(cleaned);

    return NextResponse.json(json);
  } catch (err) {
    console.error("generate-challenge error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
