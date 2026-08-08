/**
 * PROTOTYPE mock data — Admin Ops UX (Slice P) rev.2 HITL
 */

export type ScreenId =
  | "separacao"
  | "cadastro"
  | "produtos"
  | "painel"
  | "mais";

export type SeparacaoFilter =
  | "a_separar"
  | "em_separacao"
  | "urgente"
  | "all";

export type CadastroTab = "captura" | "preview";

export type MockOrderItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  priceCents: number;
  packedAt: string | null;
};

export type MockOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  purchasedAt: string;
  status: "paid" | "confirmed" | "na_sacolinha";
  fulfillment: "pickup" | "delivery";
  urgentDelivery: boolean;
  sacolinhaDeadlineSoon: boolean;
  items: MockOrderItem[];
};

export function formatOrderStatus(status: MockOrder["status"]): string {
  switch (status) {
    case "paid":
      return "Pago · a separar";
    case "confirmed":
      return "Em separação";
    case "na_sacolinha":
      return "Na Sacolinha";
    default:
      return status;
  }
}

export type MockPiece = {
  id: string;
  name: string;
  image: string;
  priceCents: number;
  badge: "hold" | "a_separar" | "em_separacao" | "disponivel";
  customerName?: string;
  orderId?: string;
  purchasedAt?: string;
  urgent?: boolean;
  packedAt?: string | null;
};

export type MockNotification = {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  body: string;
  at: string;
};

export type MockCategory = { id: string; name: string };

export type MockProductRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  priceCents: number;
  /** Capa — primeira de `images` quando existir. */
  image: string;
  /** Galeria (mock); a [0] sincroniza com `image`. */
  images?: string[];
  sizeLabel?: string;
  brand?: string;
  description?: string;
  sortOrder?: number;
  /** Hold Session TTL — only used when status === "hold" */
  holdExpiresAt?: string;
  holdCustomerName?: string;
};

export type CaptureDraft = {
  id: string;
  photoDataUrl: string | null;
  hasAudio: boolean;
  audioLocked: boolean;
  aiStatus: "idle" | "running" | "done" | "manual";
  name: string;
  priceLabel: string;
  categoryId: string | null;
};

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#d4e8a8"/><stop offset="1" stop-color="#b8d4e8"/>
      </linearGradient></defs>
      <rect fill="url(#g)" width="100%" height="100%"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#3d5a1a" font-family="system-ui" font-size="18">Peça</text>
    </svg>`,
  );

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "o1",
    code: "RP-2026-0142",
    customerName: "Ana Paula",
    customerPhone: "45999887766",
    purchasedAt: "2026-08-08T13:42:00-03:00",
    status: "paid",
    fulfillment: "delivery",
    urgentDelivery: true,
    sacolinhaDeadlineSoon: false,
    items: [
      {
        id: "i1",
        productId: "p1",
        name: "Vestido floral 4A",
        image: PLACEHOLDER,
        priceCents: 4500,
        packedAt: null,
      },
      {
        id: "i2",
        productId: "p2",
        name: "Tênis branco 26",
        image: PLACEHOLDER,
        priceCents: 6200,
        packedAt: null,
      },
    ],
  },
  {
    id: "o2",
    code: "RP-2026-0141",
    customerName: "Carlos Mendes",
    customerPhone: "45988776655",
    purchasedAt: "2026-08-08T12:15:00-03:00",
    status: "confirmed",
    fulfillment: "pickup",
    urgentDelivery: false,
    sacolinhaDeadlineSoon: false,
    items: [
      {
        id: "i3",
        productId: "p3",
        name: "Conjunto menino 2A",
        image: PLACEHOLDER,
        priceCents: 3800,
        packedAt: "2026-08-08T12:40:00-03:00",
      },
      {
        id: "i4",
        productId: "p4",
        name: "Jaqueta jeans 3A",
        image: PLACEHOLDER,
        priceCents: 5500,
        packedAt: null,
      },
      {
        id: "i4b",
        productId: "p4b",
        name: "Boné azul",
        image: PLACEHOLDER,
        priceCents: 1800,
        packedAt: null,
      },
    ],
  },
  {
    id: "o3",
    code: "RP-2026-0138",
    customerName: "Juliana Costa",
    customerPhone: "45977665544",
    purchasedAt: "2026-08-07T18:02:00-03:00",
    status: "na_sacolinha",
    fulfillment: "pickup",
    urgentDelivery: false,
    sacolinhaDeadlineSoon: true,
    items: [
      {
        id: "i5",
        productId: "p5",
        name: "Body kit 3pcs RN",
        image: PLACEHOLDER,
        priceCents: 2900,
        packedAt: "2026-08-07T18:30:00-03:00",
      },
    ],
  },
  {
    id: "o4",
    code: "RP-2026-0140",
    customerName: "Fernanda Lima",
    customerPhone: "45966554433",
    purchasedAt: "2026-08-08T11:05:00-03:00",
    status: "paid",
    fulfillment: "pickup",
    urgentDelivery: false,
    sacolinhaDeadlineSoon: false,
    items: [
      {
        id: "i6",
        productId: "p8",
        name: "Saia plissada 6A",
        image: PLACEHOLDER,
        priceCents: 3100,
        packedAt: null,
      },
    ],
  },
];

export const MOCK_HOLD_PIECES: MockPiece[] = [];

export function ordersToPieces(orders: MockOrder[]): MockPiece[] {
  return orders.flatMap((o) =>
    o.items.map((it) => ({
      id: it.id,
      name: it.name,
      image: it.image,
      priceCents: it.priceCents,
      badge:
        o.status === "paid"
          ? ("a_separar" as const)
          : ("em_separacao" as const),
      customerName: o.customerName,
      orderId: o.id,
      purchasedAt: o.purchasedAt,
      urgent: o.urgentDelivery,
      packedAt: it.packedAt,
    })),
  );
}

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "n1",
    priority: 1,
    title: "Entrega urgente",
    body: "Ana Paula · há 18 min · 2 peças",
    at: "13:42",
  },
  {
    id: "n2",
    priority: 2,
    title: "Venda nova",
    body: "Carlos Mendes · Sacolinha · 3 peças",
    at: "12:15",
  },
  {
    id: "n3",
    priority: 2,
    title: "Venda nova",
    body: "Fernanda Lima · 1 peça",
    at: "11:05",
  },
  {
    id: "n4",
    priority: 3,
    title: "Sacolinha — prazo curto",
    body: "Juliana Costa · retirar até amanhã",
    at: "ontem",
  },
];

export const INITIAL_CATEGORIES: MockCategory[] = [
  { id: "c1", name: "Meninas" },
  { id: "c2", name: "Meninos" },
  { id: "c3", name: "Bebê" },
  { id: "c4", name: "Calçados" },
];

export const MOCK_PRODUCTS: MockProductRow[] = [
  {
    id: "p1",
    name: "Vestido floral 4A",
    category: "Meninas",
    status: "sold",
    priceCents: 4500,
    image: PLACEHOLDER,
    sizeLabel: "4A",
    brand: "TipTop",
    sortOrder: 1,
  },
  {
    id: "p6",
    name: "Camiseta dino 5A",
    category: "Meninos",
    status: "available",
    priceCents: 2500,
    image: PLACEHOLDER,
    sizeLabel: "5A",
    brand: "Malwee",
    sortOrder: 2,
  },
  {
    id: "p7",
    name: "Saia plissada 6A",
    category: "Meninas",
    status: "available",
    priceCents: 3100,
    image: PLACEHOLDER,
    sizeLabel: "6A",
    sortOrder: 3,
  },
  {
    id: "p9",
    name: "Tênis LED 28",
    category: "Calçados",
    status: "available",
    priceCents: 8900,
    image: PLACEHOLDER,
    sizeLabel: "28",
    sortOrder: 4,
  },
  {
    id: "p10",
    name: "Body RN kit",
    category: "Bebê",
    status: "hold",
    priceCents: 2900,
    image: PLACEHOLDER,
    sizeLabel: "RN",
    sortOrder: 5,
    holdExpiresAt: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
    holdCustomerName: "Mariana Souza",
  },
  {
    id: "p12",
    name: "Macacão listrado 1A",
    category: "Bebê",
    status: "hold",
    priceCents: 3200,
    image: PLACEHOLDER,
    sizeLabel: "1A",
    sortOrder: 7,
    holdExpiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
    holdCustomerName: "Mariana Souza",
  },
  {
    id: "p13",
    name: "Blusa tule 8A",
    category: "Meninas",
    status: "hold",
    priceCents: 2700,
    image: PLACEHOLDER,
    sizeLabel: "8A",
    sortOrder: 8,
    holdExpiresAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
    holdCustomerName: undefined,
  },
  {
    id: "p11",
    name: "Jaqueta soft 3A",
    category: "Meninos",
    status: "available",
    priceCents: 5400,
    image: PLACEHOLDER,
    sizeLabel: "3A",
    sortOrder: 6,
  },
];

/** Valores em R$ para barras legíveis */
export const SALES_7D = [
  { day: "Dom", value: 420, sacolinha: 280, entrega: 80, balcao: 60 },
  { day: "Seg", value: 880, sacolinha: 520, entrega: 200, balcao: 160 },
  { day: "Ter", value: 640, sacolinha: 400, entrega: 140, balcao: 100 },
  { day: "Qua", value: 1120, sacolinha: 700, entrega: 280, balcao: 140 },
  { day: "Qui", value: 980, sacolinha: 610, entrega: 220, balcao: 150 },
  { day: "Sex", value: 1340, sacolinha: 820, entrega: 310, balcao: 210 },
  { day: "Sáb", value: 1560, sacolinha: 980, entrega: 360, balcao: 220 },
];

export const ACCESS_MOCK = [
  { day: "Dom", value: 186 },
  { day: "Seg", value: 412 },
  { day: "Ter", value: 358 },
  { day: "Qua", value: 501 },
  { day: "Qui", value: 467 },
  { day: "Sex", value: 622 },
  { day: "Sáb", value: 714 },
];

export const TOP_CUSTOMERS = [
  { name: "Ana Paula", orders: 8, totalCents: 48200 },
  { name: "Carlos Mendes", orders: 5, totalCents: 31100 },
  { name: "Juliana Costa", orders: 4, totalCents: 19800 },
  { name: "Fernanda Lima", orders: 3, totalCents: 15400 },
];

export const PLACEHOLDER_IMAGE = PLACEHOLDER;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPurchaseWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
