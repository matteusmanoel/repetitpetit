/**
 * Verificação live da T10 contra o projeto Supabase real:
 * 1) cria (ou reusa) um admin de teste via service role
 * 2) cria produto + imagens
 * 3) edita campos
 * 4) desativa (status=inactive)
 * 5) confirma que anon não vê a peça inativa (mesma posture do /catalogo)
 *
 * Uso: node scripts/verify-product-crud.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
/** Cliente separado só para validar login — nunca misturar sessão user no service. */
const authClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "agent-t10@repetipetit.com.br";
const TEST_PASSWORD = `T10-${randomUUID().slice(0, 12)}-Aa1!`;
const slug = `t10-agente-${Date.now()}`;

async function ensureTestAdmin() {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  let user = listed.users.find((u) => u.email === TEST_EMAIL);

  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Agente T10" },
    });
    if (error) throw error;
    user = data.user;
    console.log("created auth user", user.id);
  } else {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log("reset password for existing auth user", user.id);
  }

  const { data: adminRow, error: adminError } = await service
    .from("admins")
    .upsert(
      {
        auth_user_id: user.id,
        email: TEST_EMAIL,
        full_name: "Agente T10",
        is_active: true,
      },
      { onConflict: "email" },
    )
    .select("*")
    .single();

  if (adminError) throw adminError;
  console.log("admin row ok", adminRow.id);
  return { user, password: TEST_PASSWORD };
}

async function main() {
  const { password } = await ensureTestAdmin();

  // Sign in as admin on a dedicated anon client (não poluir o service role)
  const { data: signIn, error: signInError } =
    await authClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password,
    });
  if (signInError) throw signInError;
  console.log("admin sign-in ok", signIn.user.email);

  // CREATE
  const { data: created, error: createError } = await service
    .from("products")
    .insert({
      name: "Peça teste T10 agente",
      slug,
      description: "Criada pelo script de verificação da T10",
      price: 39.9,
      compare_at_price: 59.9,
      brand: "TestBrand",
      size_label: "M",
      size_group: "2_3a",
      gender: "unissex",
      condition: "seminovo",
      status: "available",
      quantity: 1,
      is_featured: false,
      tags: ["teste", "t10"],
      cover_image_url: `${url}/storage/v1/object/public/product-images/placeholder-t10.jpg`,
    })
    .select("*")
    .single();
  if (createError) throw createError;
  console.log("created product", created.id, created.slug);

  const { error: imagesError } = await service.from("product_images").insert([
    {
      product_id: created.id,
      image_url: `${url}/storage/v1/object/public/product-images/t10-a.jpg`,
      alt_text: "Foto 1",
      sort_order: 0,
    },
    {
      product_id: created.id,
      image_url: `${url}/storage/v1/object/public/product-images/t10-b.jpg`,
      alt_text: "Foto 2",
      sort_order: 1,
    },
  ]);
  if (imagesError) throw imagesError;
  console.log("inserted product_images");

  // Anon (catálogo) must see available product
  const { data: anonAvailable, error: anonAvailError } = await anon
    .from("products")
    .select("id, status")
    .eq("id", created.id)
    .maybeSingle();
  if (anonAvailError) throw anonAvailError;
  if (!anonAvailable || anonAvailable.status !== "available") {
    throw new Error("Anon should see available product (catalog posture).");
  }
  console.log("anon sees available product ✓");

  // EDIT
  const { data: edited, error: editError } = await service
    .from("products")
    .update({
      name: "Peça teste T10 agente (editada)",
      brand: "TestBrand Edit",
      price: 44.5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", created.id)
    .select("id, name, brand, price")
    .single();
  if (editError) throw editError;
  console.log("edited product", edited);

  // Reorder images: replace-set like the action
  await service.from("product_images").delete().eq("product_id", created.id);
  await service.from("product_images").insert([
    {
      product_id: created.id,
      image_url: `${url}/storage/v1/object/public/product-images/t10-b.jpg`,
      alt_text: "Nova capa",
      sort_order: 0,
    },
    {
      product_id: created.id,
      image_url: `${url}/storage/v1/object/public/product-images/t10-a.jpg`,
      alt_text: "Foto 2",
      sort_order: 1,
    },
  ]);
  await service
    .from("products")
    .update({
      cover_image_url: `${url}/storage/v1/object/public/product-images/t10-b.jpg`,
    })
    .eq("id", created.id);
  console.log("reordered images + cover ✓");

  // DEACTIVATE
  const { error: deactivateError } = await service
    .from("products")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", created.id);
  if (deactivateError) throw deactivateError;

  const { data: anonAfter, error: anonAfterError } = await anon
    .from("products")
    .select("id")
    .eq("id", created.id)
    .maybeSingle();
  if (anonAfterError) throw anonAfterError;
  if (anonAfter) {
    throw new Error("Anon must NOT see inactive product.");
  }
  console.log("anon no longer sees inactive product ✓");

  // Service still sees it (not deleted)
  const { data: stillThere, error: stillError } = await service
    .from("products")
    .select("id, status")
    .eq("id", created.id)
    .single();
  if (stillError) throw stillError;
  if (stillThere.status !== "inactive") {
    throw new Error("Product should remain inactive, not deleted.");
  }
  console.log("product still in DB as inactive ✓");

  console.log("\nTEST_ADMIN_EMAIL=" + TEST_EMAIL);
  console.log("TEST_ADMIN_PASSWORD=" + password);
  console.log("PRODUCT_ID=" + created.id);
  console.log("\nT10 live verification PASSED");
}

main().catch((error) => {
  console.error("T10 live verification FAILED", error);
  process.exit(1);
});
