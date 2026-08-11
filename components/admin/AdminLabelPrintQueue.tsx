"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  listLabelPrintJobsAction,
  processLabelPrintJobAction,
  reprintLabelPrintJobAction,
} from "@/features/admin/ai-intake/actions";
import {
  LABEL_PRINT_STATUS_LABELS,
  isPrintBatchComplete,
  pickNextPrintJob,
  type LabelPrintStatus,
} from "@/features/print/queue";
import { productLabelPrintPath } from "@/lib/qr/passport-url";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

type Job = Database["public"]["Tables"]["label_print_jobs"]["Row"];

type Props = {
  batchId: string;
  initialJobs: Job[];
};

function statusLabel(status: string): string {
  if (status in LABEL_PRINT_STATUS_LABELS) {
    return LABEL_PRINT_STATUS_LABELS[status as LabelPrintStatus];
  }
  return status;
}

function asQueueJobs(jobs: Job[]) {
  return jobs.map((job) => ({
    ...job,
    status: job.status as LabelPrintStatus,
  }));
}

export function AdminLabelPrintQueue({ batchId, initialJobs }: Props) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const result = await listLabelPrintJobsAction(batchId);
    if (result.ok) setJobs(result.jobs);
  }, [batchId]);

  const runSequential = useCallback(async () => {
    setRunning(true);
    setMessage(null);
    try {
      let current = jobs;
      const listed = await listLabelPrintJobsAction(batchId);
      if (listed.ok) current = listed.jobs;

      while (!isPrintBatchComplete(asQueueJobs(current))) {
        const next = pickNextPrintJob(asQueueJobs(current));
        if (!next) break;

        const result = await processLabelPrintJobAction(next.id);
        if (!result.ok) {
          setMessage(result.error);
          break;
        }

        current = current.map((job) =>
          job.id === result.job.id ? result.job : job,
        );
        setJobs(current);

        await new Promise((r) => setTimeout(r, 200));
      }

      await refresh();
      setMessage("Fila de impressão processada.");
    } finally {
      setRunning(false);
    }
  }, [batchId, jobs, refresh]);

  useEffect(() => {
    if (
      initialJobs.length > 0 &&
      !isPrintBatchComplete(asQueueJobs(initialJobs))
    ) {
      void runSequential();
    }
    // Only on mount for this batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-extrabold text-foreground">
            Impressão térmica (sequencial)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Uma etiqueta por vez com ACK. Falha não desfaz o cadastro da peça.
            Bridge offline marca a etiqueta como falhou.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl px-4 text-base"
          disabled={running || pending}
          onClick={() => startTransition(() => void runSequential())}
        >
          {running ? "Imprimindo…" : "Processar fila"}
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col">
              <span className="font-mono text-sm font-medium text-foreground">
                {job.staff_code}
              </span>
              <span className="text-xs text-muted-foreground">
                {statusLabel(job.status)}
                {job.last_error ? ` — ${job.last_error}` : ""}
                {` · tentativa ${job.attempt_count}/${job.max_attempts}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-12 rounded-xl px-4 text-base">
                <Link
                  href={productLabelPrintPath(job.product_id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Etiqueta HTML
                </Link>
              </Button>
              {(job.status === "failed" || job.status === "printed") && (
                <Button
                  type="button"
                  className="h-12 rounded-xl px-4 text-base"
                  variant="secondary"
                  disabled={running || pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await reprintLabelPrintJobAction(job.id);
                      if (!result.ok) {
                        setMessage(result.error);
                        return;
                      }
                      setJobs((prev) =>
                        prev.map((j) =>
                          j.id === result.job.id ? result.job : j,
                        ),
                      );
                      await refresh();
                    });
                  }}
                >
                  Reimprimir
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
