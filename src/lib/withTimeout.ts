export class AsyncTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${Math.round(ms / 1000)}s`);
    this.name = "AsyncTimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Request"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AsyncTimeoutError(label, ms));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function formatLoadError(error: unknown): string {
  if (error instanceof AsyncTimeoutError) {
    return "Could not reach the database. Check your connection or Supabase project status, then try again.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Failed to load data. Please try again.";
}
