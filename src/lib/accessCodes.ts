const CODE_MIN = 100_000;
/** 100000–999999 inclusive. */
const CODE_RANGE = 900_000;

/**
 * Generate a random 6-digit access code (100000–999999).
 *
 * Uses Web Crypto rather than Math.random(). V8 implements Math.random() as
 * xorshift128+, which is not cryptographically random — observing a handful of
 * outputs is enough to recover the generator state and predict the rest. These
 * codes are credentials: a mentor code claims a class workspace, and a class
 * code enrolls a student.
 *
 * Web Crypto rather than node:crypto randomInt because this module is imported
 * by client components (create-class and the mentor dashboard both generate
 * codes before inserting). A node: import would fail to bundle for the browser.
 * crypto.getRandomValues is available in browsers and in Node 18+, and is
 * cryptographically secure in both.
 *
 * Rejection sampling, not a bare modulo: 2^32 is not a multiple of 900000, so
 * `draw % CODE_RANGE` alone would make the first 167296 codes very slightly
 * more likely. Discarding the partial final block keeps the distribution flat.
 * It retries with probability ~0.0039%.
 *
 * The format is deliberately unchanged — 6 digits are in active use by existing
 * classes and students, and widening it is a migration, not a hardening fix.
 */
export function generateAccessCode(): string {
  const limit = Math.floor(0x1_0000_0000 / CODE_RANGE) * CODE_RANGE;
  const buf = new Uint32Array(1);

  let draw: number;
  do {
    crypto.getRandomValues(buf);
    draw = buf[0];
  } while (draw >= limit);

  return String(CODE_MIN + (draw % CODE_RANGE));
}

export function isUniqueViolation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || (error.message?.includes("unique") ?? false);
}
