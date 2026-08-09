"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createOrderAction } from "@/features/checkout/actions";
import { calculateFreteAction } from "@/features/checkout/calculate-frete";
import {
  CheckoutAddressSection,
  type AddressErrors,
  type AddressValues,
  type FreteQuoteUi,
} from "@/features/checkout/components/CheckoutAddressSection";
import {
  CheckoutContactSection,
  type ContactErrors,
  type ContactValues,
} from "@/features/checkout/components/CheckoutContactSection";
import { CheckoutFulfillmentSection } from "@/features/checkout/components/CheckoutFulfillmentSection";
import { CheckoutMpHandoff } from "@/features/checkout/components/CheckoutMpHandoff";
import { CheckoutOrderSummary } from "@/features/checkout/components/CheckoutOrderSummary";
import { CheckoutSection } from "@/features/checkout/components/CheckoutSection";
import { CheckoutSubmitButton } from "@/features/checkout/components/CheckoutSubmitButton";
import { isCheckoutPayEnabled } from "@/features/checkout/pay-gate";
import {
  checkoutAddressSchema,
  createOrderSchema,
} from "@/features/checkout/schemas";
import { formatPrice } from "@/features/catalog/format-price";
import { brandToast } from "@/lib/brand-toast";
import type { CheckoutPageData, FulfillmentType } from "@/features/checkout/types";
import { useCartStore } from "@/features/cart/store";
import { formatPhoneBrDisplay } from "@/lib/phone";

type CheckoutFormProps = {
  pageData: CheckoutPageData;
};

const EMPTY_ADDRESS: AddressValues = {
  recipientName: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  reference: "",
};

export function CheckoutForm({ pageData }: CheckoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCartStore((s) => s.items);
  const holdSessionIdFromStore = useCartStore((s) => s.holdSessionId);
  const clearHold = useCartStore((s) => s.clearHold);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  const holdSessionId =
    holdSessionIdFromStore ??
    searchParams.get("holdSessionId")?.trim() ??
    null;

  const deliveryAvailable = pageData.deliveryFreteConfigured;

  const [contact, setContact] = useState<ContactValues>({
    fullName: "",
    phone: "",
    email: "",
  });
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  /** D102: Sacolinha (`pickup`) sempre pré-selecionada. */
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("pickup");
  const [fulfillmentError, setFulfillmentError] = useState<string | undefined>();
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [frete, setFrete] = useState<FreteQuoteUi>({ status: "idle" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Evita empty-state flash após clearHold + redirect MP. */
  const [mpHandoff, setMpHandoff] = useState(false);

  useEffect(() => {
    if (contact.fullName && !address.recipientName) {
      setAddress((prev) => ({ ...prev, recipientName: contact.fullName }));
    }
  }, [contact.fullName, address.recipientName]);

  const freteReady =
    frete.status === "ok" &&
    frete.postalCode === address.postalCode.replace(/\D/g, "");

  const payEnabled = isCheckoutPayEnabled(fulfillmentType, {
    deliveryFreteReady: freteReady,
  });

  const shippingAmount =
    fulfillmentType === "delivery" && frete.status === "ok" ? frete.amount : 0;

  const fulfillmentLabel =
    fulfillmentType === "delivery" ? "Entrega" : "Sacolinha";

  function updateContact<K extends keyof ContactValues>(
    key: K,
    value: ContactValues[K],
  ) {
    setContact((prev) => ({ ...prev, [key]: value }));
    setContactErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateAddress<K extends keyof AddressValues>(
    key: K,
    value: AddressValues[K],
  ) {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setAddressErrors((prev) => ({ ...prev, [key]: undefined }));
    if (
      key === "postalCode" ||
      key === "city" ||
      key === "state" ||
      key === "street" ||
      key === "neighborhood"
    ) {
      setFrete({ status: "idle" });
    }
  }

  async function handleCalculateFrete() {
    const postalCode = address.postalCode.replace(/\D/g, "");
    setFrete({ status: "loading" });
    setFulfillmentError(undefined);

    const result = await calculateFreteAction({ postalCode });

    if (!result.ok) {
      setFrete({ status: "error", message: result.error });
      brandToast.error("Não foi possível calcular o frete", result.error);
      return;
    }

    setFrete({
      status: "ok",
      amount: result.amount,
      distanceKm: result.distanceKm,
      postalCode: result.postalCode,
    });
    brandToast.success(
      `Frete: ${formatPrice(result.amount)}`,
      `${result.distanceKm.toFixed(1).replace(".", ",")} km da loja`,
    );
  }

  function validateClient(): boolean {
    const nextContact: ContactErrors = {};
    const digits = contact.phone.replace(/\D/g, "");

    if (contact.fullName.trim().length < 2) {
      nextContact.fullName = "Informe seu nome completo.";
    }
    if (!/^\d{10,15}$/.test(digits)) {
      nextContact.phone = "Informe o telefone com DDD, só números.";
    }
    if (!contact.email.trim()) {
      nextContact.email = "Informe seu e-mail.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      nextContact.email = "Informe um e-mail válido.";
    }

    setContactErrors(nextContact);

    let nextFulfillmentError: string | undefined;
    if (!fulfillmentType) {
      nextFulfillmentError = "Escolha Sacolinha ou entrega.";
    } else if (fulfillmentType === "delivery" && !deliveryAvailable) {
      nextFulfillmentError =
        "Entrega imediata indisponível. Escolha Sacolinha para pagar.";
    } else if (fulfillmentType === "delivery" && !freteReady) {
      nextFulfillmentError =
        "Calcule o frete pelo CEP antes de pagar a entrega.";
    }
    setFulfillmentError(nextFulfillmentError);

    let nextAddressErrors: AddressErrors = {};
    if (fulfillmentType === "delivery" && deliveryAvailable) {
      const parsed = checkoutAddressSchema.safeParse(address);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string" && !(key in nextAddressErrors)) {
            nextAddressErrors = {
              ...nextAddressErrors,
              [key]: issue.message,
            };
          }
        }
      }
    }
    setAddressErrors(nextAddressErrors);

    return (
      Object.keys(nextContact).length === 0 &&
      !nextFulfillmentError &&
      Object.keys(nextAddressErrors).length === 0
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (items.length === 0 || !holdSessionId) {
      setSubmitError("Sua reserva está vazia. Escolha as peças novamente.");
      return;
    }

    if (!validateClient()) return;

    // Defesa: nunca cria preferência MP sem frete OK no path delivery.
    if (!payEnabled) {
      setFulfillmentError(
        fulfillmentType === "delivery"
          ? "Calcule o frete pelo CEP antes de pagar a entrega."
          : "Escolha Sacolinha ou entrega para pagar.",
      );
      return;
    }

    const payload = {
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      fulfillmentType,
      address: fulfillmentType === "delivery" ? address : undefined,
      holdSessionId,
    };

    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setPending(true);
    const result = await createOrderAction(parsed.data);

    if (!result.success) {
      setPending(false);
      setSubmitError(result.error);
      if (result.code === "reservation_expired" || result.code === "empty_cart") {
        clearHold();
      }
      return;
    }

    if (result.initPoint) {
      // Marca handoff ANTES de limpar o hold — evita flash de carrinho vazio.
      setMpHandoff(true);
      clearHold();
      window.location.assign(result.initPoint);
      return;
    }

    // Pedido criado sem init_point — limpa hold e vai ao status do pedido.
    clearHold();
    setPending(false);
    setSubmitError(
      result.paymentError ??
        "Pedido criado, mas o pagamento não pôde ser iniciado. Abra o pedido para tentar de novo.",
    );
    router.push(`/pedido/${result.publicCode}`);
  }

  if (mpHandoff) {
    return <CheckoutMpHandoff />;
  }

  if (!hasHydrated) {
    return (
      <div className="rounded-2xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Carregando seu carrinho…
      </div>
    );
  }

  if (items.length === 0 || !holdSessionId) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border px-4 py-10 text-center">
        <p className="font-heading text-xl font-bold text-foreground">
          Nenhuma peça reservada
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Toque em Comprar Agora no catálogo para reservar e continuar o checkout.
        </p>
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  const contactSummary = contact.fullName
    ? `${contact.fullName}${
        contact.phone ? ` · ${formatPhoneBrDisplay(contact.phone)}` : ""
      }${contact.email.trim() ? ` · ${contact.email.trim()}` : ""}`
    : undefined;

  const showAddressSection =
    fulfillmentType === "delivery" && deliveryAvailable;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start"
      aria-busy={pending}
    >
      {pending ? (
        <div
          className="absolute inset-0 z-10 flex items-start justify-center rounded-3xl bg-background/70 pt-24 backdrop-blur-[1px]"
          aria-hidden
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            <Loader2 className="size-4 animate-spin text-primary" />
            Preparando pagamento…
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <CheckoutSection
          step={1}
          title="Contato"
          summary={contactSummary}
          defaultOpen
        >
          <CheckoutContactSection
            values={contact}
            errors={contactErrors}
            onChange={updateContact}
          />
        </CheckoutSection>

        <CheckoutSection
          step={2}
          title="Sacolinha ou entrega"
          summary={
            fulfillmentType === "pickup"
              ? "Sacolinha"
              : fulfillmentType === "delivery"
                ? "Entrega imediata"
                : undefined
          }
          defaultOpen
        >
          <CheckoutFulfillmentSection
            value={fulfillmentType}
            deliveryAvailable={deliveryAvailable}
            pickupAddress={pageData.pickupAddress}
            error={fulfillmentError}
            onChange={(value) => {
              setFulfillmentType(value);
              setFulfillmentError(undefined);
              if (value !== "delivery") {
                setFrete({ status: "idle" });
              }
            }}
          />
        </CheckoutSection>

        {showAddressSection ? (
          <CheckoutSection
            step={3}
            title="Endereço de entrega"
            summary={
              frete.status === "ok"
                ? `Frete calculado`
                : address.street
                  ? `${address.street}, ${address.number || "s/n"}`
                  : undefined
            }
            defaultOpen
          >
            <CheckoutAddressSection
              values={address}
              errors={addressErrors}
              frete={frete}
              onChange={updateAddress}
              onAutofill={(partial) =>
                setAddress((prev) => ({ ...prev, ...partial }))
              }
              onCalculateFrete={() => void handleCalculateFrete()}
            />
          </CheckoutSection>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-44 lg:z-10 lg:self-start">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-xl font-bold text-foreground">
            Resumo
          </h2>
          <CheckoutOrderSummary
            items={items}
            shippingAmount={shippingAmount}
            fulfillmentLabel={fulfillmentLabel}
          />

          {submitError ? (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              {submitError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            <CheckoutSubmitButton
              pending={pending}
              disabled={items.length === 0 || !payEnabled}
            />
            <p className="text-center text-xs text-muted-foreground">
              {fulfillmentType === "delivery" && !freteReady
                ? "Calcule o frete pelo CEP para habilitar o pagamento."
                : payEnabled
                  ? "Você será redirecionado ao Mercado Pago para pagar com PIX ou cartão."
                  : "Selecione Sacolinha para habilitar o pagamento."}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
