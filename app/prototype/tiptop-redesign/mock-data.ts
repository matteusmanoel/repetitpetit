/** PROTOTYPE — in-memory mock only. */

export const MOCK_PRODUCTS = [
  {
    id: "1",
    title: "Vestido Xadrez Carter's Menina",
    price: "R$ 45,00",
    sizes: ["2A", "4A"],
    size: "4A",
    brand: "Carter's",
    gender: "menina" as const,
    image: "/repeti-petit-demo-assets/prod-01.webp",
  },
  {
    id: "2",
    title: "Conjunto Moletom Zara Kids",
    price: "R$ 68,00",
    sizes: ["4A", "6A", "8A"],
    size: "6A",
    brand: "Zara Kids",
    gender: "unissex" as const,
    image: "/repeti-petit-demo-assets/prod-02.webp",
  },
  {
    id: "3",
    title: "Jaqueta Jeans Gap",
    price: "R$ 79,00",
    sizes: ["5A", "6A"],
    size: "5A",
    brand: "Gap",
    gender: "menino" as const,
    image: "/repeti-petit-demo-assets/prod-03.webp",
  },
  {
    id: "4",
    title: "Tênis Nike Infantil",
    price: "R$ 95,00",
    sizes: ["26", "28", "30"],
    size: "28",
    brand: "Nike",
    gender: "unissex" as const,
    image: "/repeti-petit-demo-assets/prod-04.webp",
  },
  {
    id: "5",
    title: "Blusa Floral H&M",
    price: "R$ 32,00",
    sizes: ["3A", "4A"],
    size: "3A",
    brand: "H&M",
    gender: "menina" as const,
    image: "/repeti-petit-demo-assets/prod-05.webp",
  },
  {
    id: "6",
    title: "Calça Sarja Reserva Mini",
    price: "R$ 55,00",
    sizes: ["6A", "8A", "10A"],
    size: "8A",
    brand: "Reserva Mini",
    gender: "menino" as const,
    image: "/repeti-petit-demo-assets/prod-06.webp",
  },
] as const;

export const MOCK_CATEGORIES = [
  { name: "Vestidos", image: "/repeti-petit-demo-assets/cat-vestidos.webp" },
  { name: "Blusas", image: "/repeti-petit-demo-assets/cat-blusas.webp" },
  { name: "Calças", image: "/repeti-petit-demo-assets/cat-calcas.webp" },
  { name: "Casacos", image: "/repeti-petit-demo-assets/cat-casacos.webp" },
] as const;

/** Header category nav — text + Lucide icon name (not photo circles). */
export const MOCK_NAV_CATEGORIES = [
  { name: "Meninos", icon: "Shirt", tone: "menino" as const },
  { name: "Meninas", icon: "Gem", tone: "menina" as const },
  { name: "Bebês", icon: "Baby", tone: "neutro" as const },
  { name: "Calçados", icon: "Footprints", tone: "neutro" as const },
  { name: "Casacos", icon: "Jacket", tone: "neutro" as const },
  { name: "Desapegue", icon: "HeartHandshake", tone: "neutro" as const },
  { name: "Promoções", icon: "Percent", tone: "promo" as const },
] as const;

export const MOCK_AGES = [
  "0 - 12 meses",
  "1 - 4 anos",
  "4 - 10 anos",
  "12 - 16 anos",
] as const;

export const MOCK_ORDER = {
  code: "RP-2026-0022",
  status: "Pagamento confirmado",
  item: MOCK_PRODUCTS[0],
  total: "R$ 45,00",
  fulfillment: "Sacolinha — retire quando quiser",
} as const;

export const MOCK_AI_DRAFT = {
  title: "Vestido Xadrez Carter's Menina",
  brand: "Carter's",
  size: "4A",
  gender: "menina",
  condition: "seminovo",
  price: "45,00",
  category: "Vestidos",
  description: "Vestido xadrez vermelho e branco, ótimo estado, peça única.",
} as const;

export const MOCK_QUEUE = [
  {
    code: "RP-2026-0025",
    type: "entrega_imediata" as const,
    customer: "Ana Souza",
    items: 2,
    total: "R$ 124,00",
    frete: "R$ 18,00",
  },
  {
    code: "RP-2026-0022",
    type: "sacolinha" as const,
    customer: "Maria Lima",
    items: 1,
    total: "R$ 45,00",
  },
  {
    code: "RP-2026-0021",
    type: "sacolinha" as const,
    customer: "Paula Dias",
    items: 3,
    total: "R$ 156,00",
  },
] as const;

export const MOCK_FAQ = [
  {
    q: "O que é a Sacolinha?",
    a: "É a bolsa das suas peças já pagas na loja. Você retira quando quiser — sem pressa no dia a dia.",
  },
  {
    q: "Preciso criar conta para comprar?",
    a: "Não. Compre como visitante. Depois do pagamento, um magic link opcional libera a área da Sacolinha.",
  },
  {
    q: "Como funciona a entrega imediata?",
    a: "No checkout, escolha entrega, informe o CEP, calcule o frete e só então pague. Pedidos urgentes têm prioridade na loja.",
  },
  {
    q: "As peças são únicas?",
    a: "Sim. Cada item é peça única: reservamos no Hold Session e, após o pagamento, ela entra na sua Sacolinha.",
  },
] as const;

export type ScreenId =
  | "home"
  | "catalog"
  | "pdp"
  | "cart"
  | "checkout"
  | "pedido"
  | "sobre"
  | "privacidade"
  | "termos"
  | "admin-ia"
  | "admin-fila";

export const SCREENS: { id: ScreenId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "catalog", label: "Catálogo" },
  { id: "pdp", label: "PDP" },
  { id: "cart", label: "Carrinho" },
  { id: "checkout", label: "Checkout" },
  { id: "pedido", label: "Pedido" },
  { id: "sobre", label: "Sobre/FAQ" },
  { id: "privacidade", label: "Privacidade" },
  { id: "termos", label: "Termos" },
  { id: "admin-ia", label: "Admin IA" },
  { id: "admin-fila", label: "Fila admin" },
];

/** Color tokens — hierarchy green → blue → pink (HITL). */
export const C = {
  green: "#8EB038",
  greenDark: "#6F8C2C",
  blue: "#165DA4",
  pink: "#EB5E5C",
  ink: "#1A1A1A",
  muted: "#FAFAF7",
  line: "#E8E8E4",
} as const;
