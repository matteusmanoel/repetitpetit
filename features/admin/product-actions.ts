"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isValidRpStaffCode,
  planProductActivation,
} from "@/features/admin/activate-product";
import { requireAdminSession } from "@/features/admin/session";
import {
  parseProductFormData,
  type ProductActionState,
  type ProductFormInput,
} from "@/features/admin/product-schemas";
import { applyInventoryTransition } from "@/features/inventory/apply-transition";
import { emitProductStatusEvent } from "@/features/passport/emit-status-event";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

export type ActivateProductResult =
  | { ok: true; staffCode: string; productId: string }
  | { ok: false; error: string };

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

function toProductRow(data: ProductFormInput): ProductInsert {
  const coverImageUrl = data.images[0]?.image_url ?? null;

  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    compare_at_price: data.compare_at_price,
    brand: data.brand,
    size_label: data.size_label,
    size_group: data.size_group,
    gender: data.gender,
    condition: data.condition,
    status: data.status,
    quantity: data.quantity,
    is_featured: data.is_featured,
    tags: data.tags.length > 0 ? data.tags : null,
    category_id: data.category_id,
    cover_image_url: coverImageUrl,
  };
}

async function replaceProductImages(
  productId: string,
  images: ProductFormInput["images"],
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    throw new Error(`Falha ao atualizar imagens: ${deleteError.message}`);
  }

  if (images.length === 0) return;

  const rows = images.map((image, index) => ({
    product_id: productId,
    image_url: image.image_url,
    alt_text: image.alt_text ?? null,
    sort_order: index,
  }));

  const { error: insertError } = await supabase
    .from("product_images")
    .insert(rows);

  if (insertError) {
    throw new Error(`Falha ao salvar imagens: ${insertError.message}`);
  }
}

function revalidateProductPaths(slug?: string) {
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
  if (slug) {
    revalidatePath(`/produto/${slug}`);
  }
}

/**
 * Cria um produto + imagens. Sempre chama `requireAdminSession()` e grava via
 * service role (RLS de `products` só permite SELECT público de `available`).
 */
export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdminSession();

  const parsed = parseProductFormData(formData);
  if (!parsed.success) return parsed.state;

  const supabase = createServiceSupabaseClient();
  const row = toProductRow(parsed.data);

  const { data: created, error } = await supabase
    .from("products")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Já existe um produto com este slug. Escolha outro.",
        fieldErrors: { slug: ["Slug já em uso."] },
      };
    }
    return { error: `Não foi possível criar o produto: ${error.message}` };
  }

  try {
    await replaceProductImages(created.id, parsed.data.images);
  } catch (imageError) {
    return {
      error:
        imageError instanceof Error
          ? imageError.message
          : "Produto criado, mas as imagens falharam. Edite para tentar de novo.",
    };
  }

  revalidateProductPaths(created.slug);
  redirect(`/admin/produtos/${created.id}`);
}

/**
 * Atualiza um produto existente + sincroniza `product_images` (replace set).
 * Mudanças de status sold/inactive passam por SN-05; hold é rejeitado (SN-02).
 */
export async function updateProductAction(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const session = await requireAdminSession();

  if (!productId) {
    return { error: "Produto inválido." };
  }

  const parsed = parseProductFormData(formData);
  if (!parsed.success) return parsed.state;

  const supabase = createServiceSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("products")
    .select("id, status, slug")
    .eq("id", productId)
    .maybeSingle();

  if (loadError) {
    return {
      error: `Não foi possível carregar o produto: ${loadError.message}`,
    };
  }

  if (!existing) {
    return { error: "Produto não encontrado." };
  }

  const nextStatus = parsed.data.status;
  if (nextStatus !== existing.status) {
    if (nextStatus === "hold" || existing.status === "hold") {
      return {
        error:
          "Status hold é gerenciado pela Hold Session (SN-02). Use reserva/liberação.",
      };
    }

    if (existing.status === "sold" || nextStatus === "sold") {
      return {
        error:
          "Status sold é terminal e só muda via pagamento confirmado (SN-05).",
      };
    }

    if (existing.status === "available" && nextStatus === "inactive") {
      const transition = await applyInventoryTransition(productId, {
        from: "available",
        to: "inactive",
        context: { staffId: session.admin.id },
      });
      if (!transition.ok) {
        return {
          error: `Não foi possível alterar o status (${transition.reason}).`,
        };
      }
    } else if (existing.status === "inactive" && nextStatus === "available") {
      const transition = await applyInventoryTransition(productId, {
        from: "inactive",
        to: "available",
        context: { staffId: session.admin.id },
      });
      if (!transition.ok) {
        return {
          error: `Não foi possível alterar o status (${transition.reason}).`,
        };
      }
    } else {
      return { error: "Transição de status não permitida por este formulário." };
    }
  }

  const row = toProductRow(parsed.data);
  // Status already applied via SN-05 when changed — avoid bare status UPDATE.
  const updatePayload: Database["public"]["Tables"]["products"]["Update"] = {
    ...row,
    updated_at: new Date().toISOString(),
  };
  delete updatePayload.status;

  const { data: updated, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", productId)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Já existe um produto com este slug. Escolha outro.",
        fieldErrors: { slug: ["Slug já em uso."] },
      };
    }
    return { error: `Não foi possível salvar o produto: ${error.message}` };
  }

  if (!updated) {
    return { error: "Produto não encontrado." };
  }

  try {
    await replaceProductImages(productId, parsed.data.images);
  } catch (imageError) {
    return {
      error:
        imageError instanceof Error
          ? imageError.message
          : "Dados salvos, mas as imagens falharam. Tente novamente.",
    };
  }

  revalidateProductPaths(updated.slug);
  redirect(`/admin/produtos/${productId}`);
}

/**
 * Soft-delete operacional: `available → inactive` via SN-05 (D67).
 * Some do catálogo público sem apagar a linha nem as imagens.
 */
export async function deactivateProductAction(
  productId: string,
): Promise<ProductActionState> {
  const session = await requireAdminSession();

  if (!productId) {
    return { error: "Produto inválido." };
  }

  const supabase = createServiceSupabaseClient();
  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, slug, status")
    .eq("id", productId)
    .maybeSingle();

  if (loadError) {
    return {
      error: `Não foi possível carregar o produto: ${loadError.message}`,
    };
  }

  if (!product) {
    return { error: "Produto não encontrado." };
  }

  if (product.status === "inactive") {
    revalidateProductPaths(product.slug);
    redirect("/admin/produtos");
  }

  if (product.status !== "available") {
    return {
      error:
        "Só é possível desativar peças disponíveis. Libere hold ou use o fluxo correto de inventário.",
    };
  }

  const transition = await applyInventoryTransition(productId, {
    from: "available",
    to: "inactive",
    context: { staffId: session.admin.id },
  });

  if (!transition.ok) {
    return {
      error: `Não foi possível desativar o produto (${transition.reason}).`,
    };
  }

  revalidateProductPaths(product.slug);
  redirect("/admin/produtos");
}

/**
 * SN-09 — ativa peça para o chão de loja: atribui `staff_code` (RP-XXXXXX)
 * exatamente uma vez e garante `status = available` (D64 / D67).
 *
 * Idempotente se o código já existir. Não altera hold/sold (SN-02 / SN-05).
 * SN-15: emite `product_status_events` (context=activation) via TS — staff_code
 * assignment is outside inventory RPCs.
 */
export async function activateProductAction(
  productId: string,
): Promise<ActivateProductResult> {
  const session = await requireAdminSession();

  if (!productId) {
    return { ok: false, error: "Produto inválido." };
  }

  const supabase = createServiceSupabaseClient();

  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, status, staff_code, slug")
    .eq("id", productId)
    .maybeSingle();

  if (loadError) {
    return {
      ok: false,
      error: `Não foi possível carregar o produto: ${loadError.message}`,
    };
  }

  if (!product) {
    return { ok: false, error: "Produto não encontrado." };
  }

  const plan = planProductActivation(product);

  if (plan.kind === "reject") {
    return { ok: false, error: plan.error };
  }

  if (plan.kind === "idempotent") {
    if (plan.setAvailable) {
      // SN-05 owns inactive → available
      const fromStatus = product.status;
      const transition = await applyInventoryTransition(productId, {
        from: "inactive",
        to: "available",
        context: { staffId: session.admin.id },
      });

      if (!transition.ok) {
        return {
          ok: false,
          error: `Não foi possível reativar a peça (${transition.reason}).`,
        };
      }

      if (transition.outcome !== "already_sold") {
        const emitted = await emitProductStatusEvent({
          productId,
          fromStatus,
          toStatus: "available",
          actorType: "admin",
          actorId: session.admin.id,
          context: "activation",
          notes: `${plan.staffCode} atribuído`,
        });
        if (!emitted.ok) {
          console.error("activateProductAction status event:", emitted.error);
        }
      }
    }

    revalidateProductPaths(product.slug);
    return {
      ok: true,
      staffCode: plan.staffCode,
      productId: product.id,
    };
  }

  const { data: nextCode, error: seqError } = await supabase.rpc(
    "next_rp_staff_code",
  );

  if (seqError || !nextCode || typeof nextCode !== "string") {
    return {
      ok: false,
      error: seqError
        ? `Não foi possível gerar o código RP: ${seqError.message}`
        : "Não foi possível gerar o código RP.",
    };
  }

  if (!isValidRpStaffCode(nextCode)) {
    return {
      ok: false,
      error: `Código RP inválido gerado pelo banco: ${nextCode}`,
    };
  }

  const wasInactive = product.status === "inactive";
  const fromStatus = product.status === "available" ? null : product.status;

  // Assign staff_code only (status via SN-05 when inactive → available).
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({
      staff_code: nextCode,
      ...(wasInactive ? {} : { status: "available" as const }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .is("staff_code", null)
    .select("id, staff_code, slug, status")
    .maybeSingle();

  if (updateError) {
    return {
      ok: false,
      error: `Não foi possível ativar a peça: ${updateError.message}`,
    };
  }

  if (!updated) {
    // Concurrent activation won — reload and return existing code (idempotent).
    const { data: raced, error: raceError } = await supabase
      .from("products")
      .select("id, staff_code, slug")
      .eq("id", productId)
      .maybeSingle();

    if (raceError || !raced?.staff_code) {
      return {
        ok: false,
        error: "Não foi possível ativar a peça (conflito de ativação).",
      };
    }

    revalidateProductPaths(raced.slug);
    return {
      ok: true,
      staffCode: raced.staff_code,
      productId: raced.id,
    };
  }

  if (wasInactive) {
    const transition = await applyInventoryTransition(productId, {
      from: "inactive",
      to: "available",
      context: { staffId: session.admin.id },
    });

    if (!transition.ok) {
      return {
        ok: false,
        error: `Código atribuído, mas falhou ao reativar inventário (${transition.reason}).`,
      };
    }
  }

  const staffCode = updated.staff_code ?? nextCode;
  const emitted = await emitProductStatusEvent({
    productId: updated.id,
    fromStatus,
    toStatus: "available",
    actorType: "admin",
    actorId: session.admin.id,
    context: "activation",
    notes: `${staffCode} atribuído`,
  });
  if (!emitted.ok) {
    console.error("activateProductAction status event:", emitted.error);
  }

  revalidateProductPaths(updated.slug);
  return {
    ok: true,
    staffCode,
    productId: updated.id,
  };
}
