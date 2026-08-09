"use server";

import { revalidatePath } from "next/cache";

import {
  isValidRpStaffCode,
  planProductActivation,
} from "@/features/admin/activate-product";
import {
  generateAiPreviewDrafts,
  isAiIntakeConfigured,
} from "@/features/admin/ai-intake/ai-provider";
import {
  confirmIntakeBatchSchema,
  generatePreviewInputSchema,
  type IntakeDraftItem,
  type IntakeFinalizeItem,
} from "@/features/admin/ai-intake/schemas";
import { coerceProductSizeLabel, slugifyProductName } from "@/features/admin/product-constants";
import { createCategoryInlineAction } from "@/features/admin/product-dialog-actions";
import { requireAdminSession } from "@/features/admin/session";
import { emitProductStatusEvent } from "@/features/passport/emit-status-event";
import {
  matchCategoryByName,
  normalizeBrandName,
  evaluatePublishGate,
} from "@/features/admin/ai-intake/category-match";
import { draftHasValidationConflicts } from "@/features/admin/ai-intake/business-validator";
import { applyPrintAttempt } from "@/features/print/queue";
import { resolveThermalPrintBridge } from "@/features/print/bridge";
import { env } from "@/lib/env";
import { buildPassportUrl } from "@/lib/qr/passport-url";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type LabelPrintJobRow = Database["public"]["Tables"]["label_print_jobs"]["Row"];

export type GeneratePreviewResult =
  | {
      ok: true;
      drafts: IntakeDraftItem[];
      mode: "ai" | "manual";
      aiConfigured: boolean;
      warning?: string;
    }
  | { ok: false; error: string };

export type ConfirmIntakeResult =
  | {
      ok: true;
      batchId: string;
      created: Array<{
        clientId: string;
        productId: string;
        staffCode: string;
        jobId: string;
      }>;
      jobs: LabelPrintJobRow[];
    }
  | { ok: false; error: string };

export type PrintJobAckResult =
  | { ok: true; job: LabelPrintJobRow }
  | { ok: false; error: string };

function toProductInsert(
  item: IntakeFinalizeItem,
  status: "available" | "inactive",
): ProductInsert {
  const coverImageUrl = item.images[0]?.image_url ?? null;
  const name = item.name.trim() || "Peça sem nome";
  const slugBase = item.slug || slugifyProductName(name) || `peca-${item.client_id.slice(0, 8)}`;
  const sizeLabel = item.size_label.trim()
    ? coerceProductSizeLabel(item.size_label)
    : "M";
  return {
    name,
    slug: slugBase,
    description: item.description ?? null,
    price: item.price,
    compare_at_price: item.compare_at_price ?? null,
    brand: normalizeBrandName(item.brand),
    size_label: sizeLabel,
    size_group: item.size_group,
    gender: item.gender,
    condition: item.condition,
    status,
    quantity: 1,
    is_featured: false,
    tags: item.tags.length > 0 ? item.tags : null,
    category_id: item.category_id,
    cover_image_url: coverImageUrl,
  };
}

async function assignStaffCode(
  productId: string,
  adminId: string,
): Promise<{ ok: true; staffCode: string } | { ok: false; error: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, status, staff_code, slug")
    .eq("id", productId)
    .maybeSingle();

  if (loadError || !product) {
    return {
      ok: false,
      error: loadError?.message ?? "Produto não encontrado após criar.",
    };
  }

  const plan = planProductActivation(product);
  if (plan.kind === "reject") {
    return { ok: false, error: plan.error };
  }
  if (plan.kind === "idempotent") {
    return { ok: true, staffCode: plan.staffCode };
  }

  const { data: nextCode, error: seqError } = await supabase.rpc(
    "next_rp_staff_code",
  );

  if (seqError || !nextCode || typeof nextCode !== "string") {
    return {
      ok: false,
      error: seqError?.message ?? "Falha ao gerar staff_code.",
    };
  }

  if (!isValidRpStaffCode(nextCode)) {
    return { ok: false, error: `Código RP inválido: ${nextCode}` };
  }

  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({
      staff_code: nextCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .is("staff_code", null)
    .select("id, staff_code, status")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const staffCode = updated?.staff_code ?? nextCode;
  const toStatus = updated?.status ?? product.status;

  const emitted = await emitProductStatusEvent({
    productId,
    fromStatus: null,
    toStatus,
    actorType: "admin",
    actorId: adminId,
    context: "activation",
    notes: `${staffCode} atribuído (intake IA)`,
  });
  if (!emitted.ok) {
    console.error("intake assignStaffCode event:", emitted.error);
  }

  return { ok: true, staffCode };
}

export async function getAiIntakeStatusAction(): Promise<{
  aiConfigured: boolean;
}> {
  await requireAdminSession();
  return { aiConfigured: isAiIntakeConfigured(env) };
}

export async function generateIntakePreviewAction(
  raw: unknown,
): Promise<GeneratePreviewResult> {
  await requireAdminSession();

  const parsed = generatePreviewInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Payload de preview inválido.",
    };
  }

  const result = await generateAiPreviewDrafts({
    env,
    input: parsed.data,
  });

  return {
    ok: true,
    drafts: result.drafts,
    mode: result.mode,
    aiConfigured: isAiIntakeConfigured(env),
    warning: result.warning,
  };
}

/**
 * Confirm editable preview → create available products + staff_code + print jobs.
 * Print is enqueued only; failure later never rolls back products (SO-04).
 */
export async function confirmIntakeBatchAction(
  raw: unknown,
): Promise<ConfirmIntakeResult> {
  const session = await requireAdminSession();

  const parsed = confirmIntakeBatchSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first
        ? `${first.path.join(".")}: ${first.message}`
        : "Preview inválido. Corrija os campos antes de confirmar.",
    };
  }

  const supabase = createServiceSupabaseClient();
  const batchId = crypto.randomUUID();
  const created: Array<{
    clientId: string;
    productId: string;
    staffCode: string;
    jobId: string;
  }> = [];
  const jobRows: LabelPrintJobRow[] = [];

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  let categories = (categoryRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  for (let index = 0; index < parsed.data.items.length; index += 1) {
    let item = parsed.data.items[index];

    if (!item.category_id && item.category_name?.trim()) {
      const matched = matchCategoryByName(categories, item.category_name);
      if (matched) {
        item = { ...item, category_id: matched.id };
      } else {
        const createdCat = await createCategoryInlineAction(
          item.category_name.trim(),
        );
        if (createdCat.ok) {
          categories = [...categories, createdCat.category];
          item = { ...item, category_id: createdCat.category.id };
        }
      }
    }

    const hasConflict = draftHasValidationConflicts(item);
    const gate = evaluatePublishGate({
      name: item.name,
      price: item.price,
      size_label: item.size_label,
      images: item.images,
      hasConflict,
    });
    const status =
      item.publish && gate.ok ? ("available" as const) : ("inactive" as const);

    let row = toProductInsert(item, status);

    // Unique slug: append short suffix on conflict.
    let createdProduct: { id: string; slug: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug =
        attempt === 0
          ? row.slug
          : `${row.slug}-${crypto.randomUUID().slice(0, 6)}`;
      const { data, error } = await supabase
        .from("products")
        .insert({ ...row, slug })
        .select("id, slug")
        .single();

      if (!error && data) {
        createdProduct = data;
        break;
      }
      if (error?.code !== "23505") {
        return {
          ok: false,
          error: `Falha ao criar peça "${item.name || "sem nome"}": ${error?.message ?? "erro"}`,
        };
      }
      row = { ...row, slug };
    }

    if (!createdProduct) {
      return {
        ok: false,
        error: `Não foi possível gerar slug único para "${item.name || "sem nome"}".`,
      };
    }

    if (item.images.length > 0) {
      const imageRows = item.images.map((image, sortOrder) => ({
        product_id: createdProduct.id,
        image_url: image.image_url,
        alt_text: image.alt_text ?? null,
        sort_order: sortOrder,
      }));
      const { error: imageError } = await supabase
        .from("product_images")
        .insert(imageRows);
      if (imageError) {
        return {
          ok: false,
          error: `Produto criado, mas imagens falharam (${imageError.message}). Edite a peça.`,
        };
      }
    }

    const activated = await assignStaffCode(
      createdProduct.id,
      session.admin.id,
    );
    if (!activated.ok) {
      return {
        ok: false,
        error: `Produto criado, mas staff_code falhou: ${activated.error}`,
      };
    }

    const { data: job, error: jobError } = await supabase
      .from("label_print_jobs")
      .insert({
        batch_id: batchId,
        product_id: createdProduct.id,
        staff_code: activated.staffCode,
        status: "pending",
        sort_order: index,
        attempt_count: 0,
        max_attempts: 2,
        created_by: session.admin.id,
      })
      .select("*")
      .single();

    if (jobError || !job) {
      // Product already created — do not roll back; surface print enqueue failure.
      console.error("label_print_jobs insert failed:", jobError?.message);
      return {
        ok: false,
        error: `Peça ${activated.staffCode} criada, mas a fila de impressão falhou: ${jobError?.message ?? "erro"}. Use reimpressão na ficha.`,
      };
    }

    created.push({
      clientId: item.client_id,
      productId: createdProduct.id,
      staffCode: activated.staffCode,
      jobId: job.id,
    });
    jobRows.push(job);
  }

  revalidatePath("/admin/produtos");
  return { ok: true, batchId, created, jobs: jobRows };
}

export async function listLabelPrintJobsAction(
  batchId: string,
): Promise<{ ok: true; jobs: LabelPrintJobRow[] } | { ok: false; error: string }> {
  await requireAdminSession();
  if (!batchId) return { ok: false, error: "Lote inválido." };

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("label_print_jobs")
    .select("*")
    .eq("batch_id", batchId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, jobs: data ?? [] };
}

/**
 * Mark job printing → run bridge → ACK printed|failed.
 * Never deletes/rolls back the product.
 */
export async function processLabelPrintJobAction(
  jobId: string,
): Promise<PrintJobAckResult> {
  await requireAdminSession();
  if (!jobId) return { ok: false, error: "Job inválido." };

  const supabase = createServiceSupabaseClient();
  const { data: job, error: loadError } = await supabase
    .from("label_print_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (loadError || !job) {
    return { ok: false, error: loadError?.message ?? "Job não encontrado." };
  }

  if (job.status === "printed") {
    return { ok: true, job };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, size_label, staff_code")
    .eq("id", job.product_id)
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      error: productError?.message ?? "Produto do job não encontrado.",
    };
  }

  await supabase
    .from("label_print_jobs")
    .update({
      status: "printing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  const bridge = resolveThermalPrintBridge(env.THERMAL_PRINT_BRIDGE_URL);
  const staffCode = job.staff_code || product.staff_code || "";
  const result = await bridge.printLabel({
    storeName: env.NEXT_PUBLIC_STORE_NAME,
    staffCode,
    productName: product.name,
    sizeLabel: product.size_label,
    passportUrl: buildPassportUrl(env.NEXT_PUBLIC_SITE_URL, staffCode),
  });

  const next = applyPrintAttempt(
    {
      id: job.id,
      status: "printing",
      attempt_count: job.attempt_count,
      max_attempts: job.max_attempts,
      sort_order: job.sort_order,
    },
    result.ok
      ? { ok: true }
      : { ok: false, error: result.error },
  );

  const { data: updated, error: updateError } = await supabase
    .from("label_print_jobs")
    .update({
      status: next.status,
      attempt_count: next.attempt_count,
      last_error: next.last_error,
      printed_at: next.printed_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return {
      ok: false,
      error: updateError?.message ?? "Falha ao gravar ACK de impressão.",
    };
  }

  // Mirror label_print into metadata_json (non-fatal; never rolls back product).
  const { data: existingMeta } = await supabase
    .from("products")
    .select("metadata_json")
    .eq("id", product.id)
    .maybeSingle();
  const prev =
    existingMeta?.metadata_json &&
    typeof existingMeta.metadata_json === "object" &&
    !Array.isArray(existingMeta.metadata_json)
      ? (existingMeta.metadata_json as Record<string, unknown>)
      : {};
  await supabase
    .from("products")
    .update({
      metadata_json: { ...prev, label_print: next.status },
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);

  return { ok: true, job: updated };
}

/**
 * Re-queue a failed (or exhausted) job: reset to pending with attempt_count
 * cleared for a fresh reprint cycle (max_attempts remains 2).
 */
export async function reprintLabelPrintJobAction(
  jobId: string,
): Promise<PrintJobAckResult> {
  await requireAdminSession();
  if (!jobId) return { ok: false, error: "Job inválido." };

  const supabase = createServiceSupabaseClient();
  const { data: job, error } = await supabase
    .from("label_print_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    return { ok: false, error: error?.message ?? "Job não encontrado." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("label_print_jobs")
    .update({
      status: "pending",
      attempt_count: 0,
      last_error: null,
      printed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return {
      ok: false,
      error: updateError?.message ?? "Falha ao reenfileirar impressão.",
    };
  }

  return processLabelPrintJobAction(jobId);
}
