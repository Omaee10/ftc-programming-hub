import { getSingletonHighlighter } from "shiki";

// Keep this union in sync with the `langs` loaded in getHighlighter below —
// advertising a language that isn't loaded makes shiki throw at render time.
// (Gradle build files use "groovy".)
export type SupportedLang =
  | "java"
  | "kotlin"
  | "groovy"
  | "bash"
  | "json"
  | "yaml";

/**
 * Returns a cached shiki highlighter instance loaded with all langs/themes we
 * need. Calling this multiple times is safe — shiki's getSingletonHighlighter
 * reuses the same instance after the first call.
 */
export const getHighlighter = () =>
  getSingletonHighlighter({
    themes: ["github-dark"],
    langs: ["java", "kotlin", "groovy", "bash", "json", "yaml"],
  });
