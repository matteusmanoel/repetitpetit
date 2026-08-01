"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/features/admin/session";
import {
  parseProductFormData,
  type ProductActionState,
  type ProductFormInput,
} from "@/features/admin/product-schemas";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

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
 */
export async function updateProductAction(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdminSession();

  if (!productId) {
    return { error: "Produto inválido." };
  }

  const parsed = parseProductFormData(formData);
  if (!parsed.success) return parsed.state;

  const supabase = createServiceSupabaseClient();
  const row = toProductRow(parsed.data);

  const { data: updated, error } = await supabase
    .from("products")
    .update({ ...row, updated_at: new Date().toISOString() })
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
 * Soft-delete operacional: `status = 'inactive'` — some do catálogo público
 * (RLS: anon só vê `available`) sem apagar a linha nem as imagens.
 */
export async function deactivateProductAction(
  productId: string,
): Promise<ProductActionState> {
  await requireAdminSession();

  if (!productId) {
    return { error: "Produto inválido." };
  }

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    return { error: `Não foi possível desativar o produto: ${error.message}` };
  }

  if (!data) {
    return { error: "Produto não encontrado." };
  }

  revalidateProductPaths(data.slug);
  redirect("/admin/produtos");
}
