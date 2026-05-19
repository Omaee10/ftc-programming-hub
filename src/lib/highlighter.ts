import { getSingletonHighlighter } from "shiki";

export type SupportedLang =
  | "java"
  | "kotlin"
  | "groovy"
  | "bash"
  | "json"
  | "yaml"
  | "gradle";

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
