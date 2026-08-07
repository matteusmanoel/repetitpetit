/**
 * Pure sequential label-print queue helpers (SO-04 / D107).
 * Status machine: pending → printing → printed | failed.
 * One automatic retry (max_attempts default 2 = initial + 1 retry).
 */

export const LABEL_PRINT_STATUSES = [
  "pending",
  "printing",
  "printed",
  "failed",
] as const;

export type LabelPrintStatus = (typeof LABEL_PRINT_STATUSES)[number];

export type LabelPrintJobLike = {
  id: string;
  status: LabelPrintStatus;
  attempt_count: number;
  max_attempts: number;
  sort_order: number;
};

export type PrintAttemptResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Next job to print in a batch: lowest sort_order among pending,
 * or failed jobs that still have attempts left (treat as retryable pending).
 */
export function pickNextPrintJob<T extends LabelPrintJobLike>(
  jobs: readonly T[],
): T | null {
  const candidates = jobs
    .filter((job) => {
      if (job.status === "pending") return true;
      if (job.status === "failed" && job.attempt_count < job.max_attempts) {
        return true;
      }
      return false;
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

  return candidates[0] ?? null;
}

export function canRetryPrintJob(job: LabelPrintJobLike): boolean {
  return job.status === "failed" && job.attempt_count < job.max_attempts;
}

export function isPrintBatchComplete(
  jobs: readonly LabelPrintJobLike[],
): boolean {
  return jobs.every(
    (job) =>
      job.status === "printed" ||
      (job.status === "failed" && job.attempt_count >= job.max_attempts),
  );
}

/**
 * After a bridge attempt: bump attempt_count; printed on success;
 * failed when attempts exhausted or always after a failed attempt
 * (retry is a separate enqueue of another attempt via pickNext).
 */
export function applyPrintAttempt(
  job: LabelPrintJobLike,
  result: PrintAttemptResult,
): {
  status: LabelPrintStatus;
  attempt_count: number;
  last_error: string | null;
  printed_at: string | null;
} {
  const attempt_count = job.attempt_count + 1;

  if (result.ok) {
    return {
      status: "printed",
      attempt_count,
      last_error: null,
      printed_at: new Date().toISOString(),
    };
  }

  return {
    status: "failed",
    attempt_count,
    last_error: result.error,
    printed_at: null,
  };
}

export const LABEL_PRINT_STATUS_LABELS: Record<LabelPrintStatus, string> = {
  pending: "Na fila",
  printing: "Imprimindo",
  printed: "Impressa",
  failed: "Falhou",
};
