import type { Database } from "@/lib/supabase/types";

export type FulfillmentType = Extract<
  Database["public"]["Enums"]["fulfillment_type"],
  "pickup" | "delivery"
>;

export type CheckoutAddressInput = {
  recipientName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference?: string;
};

export type CheckoutCartLine = {
  productId: string;
};

export type ShippingRuleOption = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  /** Cidades cobertas (metadata_json.cities), se houver. */
  cities: string[];
  state: string | null;
};

export type CheckoutPageData = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  /** Entrega imediata com CEP loja + coords + knobs (D104). */
  deliveryFreteConfigured: boolean;
  pickupAddress: string | null;
  deliveryRule: ShippingRuleOption | null;
  pickupRule: ShippingRuleOption | null;
};

export type CreateOrderSuccess = {
  success: true;
  publicCode: string;
  orderId: string;
  /** URL Checkout Pro (`init_point` / sandbox). Null se MP falhou após criar o pedido. */
  initPoint: string | null;
  paymentError?: string;
};

export type CreateOrderFailure = {
  success: false;
  error: string;
  /** Hold expirada / inválida — cliente deve limpar o espelho local. */
  code?:
    | "reservation_expired"
    | "empty_cart"
    | "validation"
    | "shipping"
    | "payment";
};

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;
