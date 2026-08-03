export type CreateStoreOrderSuccess = {
  ok: true;
  orderId: string;
  publicCode: string;
};

export type CreateStoreOrderFailure = {
  ok: false;
  error: string;
  code: "validation" | "unavailable" | "db";
};

export type CreateStoreOrderResult =
  | CreateStoreOrderSuccess
  | CreateStoreOrderFailure;

export type ConfirmStoreSaleSuccess = {
  ok: true;
  outcome: "applied" | "already_paid";
  orderId: string;
  publicCode: string;
};

export type ConfirmStoreSaleFailure = {
  ok: false;
  error: string;
  code: "validation" | "not_found" | "invalid" | "db" | "inventory";
};

export type ConfirmStoreSaleResult =
  | ConfirmStoreSaleSuccess
  | ConfirmStoreSaleFailure;
