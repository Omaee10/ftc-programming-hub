/** Generate a random 6-digit access code (100000–999999). */
export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isUniqueViolation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || (error.message?.includes("unique") ?? false);
}
