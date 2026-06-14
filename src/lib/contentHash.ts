/** Fast SHA-256 hex digest for deduplicating cloud snapshot writes. */
export async function digestText(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return text;
}

export async function digestJson(value: unknown): Promise<string> {
  return digestText(JSON.stringify(value));
}
