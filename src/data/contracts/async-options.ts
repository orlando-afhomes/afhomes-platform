export type MockAsyncOptions = {
  delayMs?: number;
  shouldFail?: boolean;
  errorMessage?: string;
  signal?: AbortSignal;
};

export async function simulateAsync(options?: MockAsyncOptions) {
  const delayMs = options?.delayMs ?? 0;
  const shouldFail = options?.shouldFail ?? false;
  const errorMessage = options?.errorMessage ?? "Mock repository operation failed.";

  if (delayMs <= 0) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (shouldFail) throw new Error(errorMessage);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (shouldFail) reject(new Error(errorMessage));
      else resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });
  });
}
