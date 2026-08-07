"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createOrderAction } from "@/features/checkout/actions";
import {
  CheckoutAddressSection,
  type AddressErrors,
  type AddressValues,
} from "@/features/checkout/components/CheckoutAddressSection";
import {
  CheckoutContactSection,
  type ContactErrors,
  type ContactValues,
} from "@/features/checkout/components/CheckoutContactSection";
import { CheckoutFulfillmentSection } from "@/features/checkout/components/CheckoutFulfillmentSection";
import { CheckoutOrderSummary } from "@/features/checkout/components/CheckoutOrderSummary";
import { CheckoutSection } from "@/features/checkout/components/CheckoutSection";
import { CheckoutSubmitButton } from "@/features/checkout/components/CheckoutSubmitButton";
import {
  checkoutAddressSchema,
  createOrderSchema,
} from "@/features/checkout/schemas";
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

  const [contact, setContact] = useState<ContactValues>({
    fullName: "",
    phone: "",
    email: "",
  });
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | "">(
    pageData.pickupEnabled ? "pickup" : pageData.deliveryEnabled ? "delivery" : "",
  );
  const [fulfillmentError, setFulfillmentError] = useState<string | undefined>();
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (contact.fullName && !address.recipientName) {
      setAddress((prev) => ({ ...prev, recipientName: contact.fullName }));
    }
  }, [contact.fullName, address.recipientName]);

  const shippingAmount = useMemo(() => {
    if (fulfillmentType === "delivery") {
      return pageData.deliveryRule?.amount ?? 0;
    }
    return 0;
  }, [fulfillmentType, pageData.deliveryRule?.amount]);

  const fulfillmentLabel =
    fulfillmentType === "delivery" ? "Entrega" : "Retirada";

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
      nextFulfillmentError = "Escolha retirada ou entrega.";
    }
    setFulfillmentError(nextFulfillmentError);

    let nextAddressErrors: AddressErrors = {};
    if (fulfillmentType === "delivery") {
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

    // Limpa o espelho local após pedido criado (antes do redirect MP).
    clearHold();

    if (result.initPoint) {
      window.location.assign(result.initPoint);
      return;
    }

    setPending(false);
    setSubmitError(
      result.paymentError ??
        "Pedido criado, mas o pagamento não pôde ser iniciado. Abra o pedido para tentar de novo.",
    );
    router.push(`/pedido/${result.publicCode}`);
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

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start"
    >
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
          title="Retirada ou entrega"
          summary={
            fulfillmentType
              ? fulfillmentType === "pickup"
                ? "Retirada na loja"
                : "Entrega"
              : undefined
          }
          defaultOpen
        >
          <CheckoutFulfillmentSection
            value={fulfillmentType}
            pickupEnabled={pageData.pickupEnabled}
            deliveryEnabled={pageData.deliveryEnabled}
            pickupAddress={pageData.pickupAddress}
            deliveryAmount={pageData.deliveryRule?.amount ?? null}
            deliveryDescription={pageData.deliveryRule?.description ?? null}
            error={fulfillmentError}
            onChange={(value) => {
              setFulfillmentType(value);
              setFulfillmentError(undefined);
            }}
          />
        </CheckoutSection>

        {fulfillmentType === "delivery" ? (
          <CheckoutSection
            step={3}
            title="Endereço de entrega"
            summary={
              address.street
                ? `${address.street}, ${address.number || "s/n"}`
                : undefined
            }
            defaultOpen
          >
            <CheckoutAddressSection
              values={address}
              errors={addressErrors}
              deliveryRule={pageData.deliveryRule}
              onChange={updateAddress}
              onAutofill={(partial) =>
                setAddress((prev) => ({ ...prev, ...partial }))
              }
            />
          </CheckoutSection>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-20">
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
            <CheckoutSubmitButton pending={pending} disabled={items.length === 0} />
            <p className="text-center text-xs text-muted-foreground">
              Você será redirecionado ao Mercado Pago para pagar com PIX ou
              cartão.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
