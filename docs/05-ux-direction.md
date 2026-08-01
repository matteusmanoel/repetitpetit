# 05 — Direção de UX

## Princípio central

> "Peça certa, tamanho certo, pagar e pronto."

Cada decisão de UI é avaliada por: **"isso reduz ou aumenta os passos até o pagamento?"**

## Mobile-first obrigatório

- Breakpoint de desenvolvimento padrão: **375px** (iPhone SE).
- Testar em 375px antes de ajustar para 768px e 1280px.
- Nenhum elemento interativo menor que 44×44px.
- Fonte mínima: 14px para texto auxiliar, 16px para inputs (evita zoom no iOS).
- Nenhum hover-only como indicador de estado — usar active/focus também.

---

## Filtros do catálogo

Prioridade conforme solicitado (maior = mais importante):

| # | Filtro | Tipo | Campo em `products` | Notas |
|---|---|---|---|---|
| 1 | **Tamanho** | multi-select chips | `size_group` + `size_label` | Mostrar rótulos "RN", "3–6m", "2 anos", etc. |
| 2 | **Gênero** | tabs (Menino / Menina / Unissex) | `gender` | Destaque visual, não escondido em dropdown |
| 3 | **Faixa etária** | range ou chips agrupados | `size_group` agrupado | Baby (RN–24m), Criança (2–8a), Kids+ (9–12a) |
| 4 | **Marca** | multi-select com busca | `brand` | Listar marcas presentes no DB |
| 5 | **Conservação** | pills com ícone | `condition` | Mostrar descrição ao hover/tap |
| 6 | **Preço** | slider ou faixas | `price` | Faixas: até R$30 / R$30–60 / R$60–100 / acima |

Persistência: filtros refletidos em query params para compartilhar/bookmarkar links.
Filtros ativos: chips removíveis no topo do grid.
Ordenação padrão: mais recentes primeiro (`created_at DESC`).

---

## PDP (Página do Produto)

### Layout mobile (stack vertical)

```
[Gallery — aspect 3/4, swipeable, dots]
[Nome do produto — Nunito 700, 22px]
[Preço — destaque primary, strike no compare_at_price]
[Badge "Peça única"] ← sempre visível se quantity = 1
[Seção de atributos]
  Marca: GAP   Tamanho: 18–24m   Condição: Seminovo
  Gênero: Menina
[Descrição livre (medidas, observações)]
[CTA: "Adicionar ao carrinho" — full-width, rounded-full, primary]
[Indicador de reserva se item está reservado por outro]
[Seção: "Você pode gostar" (peças relacionadas por tamanho/gênero)]
```

### Indicador de reserva ativa

Se `cart_reservations` possui uma linha para o `product_id` com `expires_at > now()`,
mas `session_id` diferente da sessão atual:

```
⏳ Reservado por outro comprador — liberado se não finalizar a compra
```

Se pertence à sessão atual (já está no carrinho):

```
✓ No seu carrinho — 18min restantes
```

### "Peça única" signal

Badge vermelho/coral (`--destructive`) visível sem scroll:
`Atenção: peça única! Quando acabar, acabou.`

---

## Carrinho

- Sheet deslizante da direita (mobile e desktop).
- Timer regressivo por item (countdown numérico: `12:34`).
- Ao expirar: item some com toast "A reserva da peça X expirou" e produto volta a 'available'.
- CTA principal: "Finalizar compra" — primary, full-width.
- CTA secundário: "Continuar comprando" — ghost.
- Sem giftwrap, mensagem de cartão ou extras no MVP.

---

## Checkout

Uma única página (não multi-step no mobile).
Seções colapsáveis em mobile, layout `grid-cols-[1fr_380px]` em desktop.

1. **Contato**: nome completo + telefone (obrigatório; sem e-mail obrigatório)
2. **Fulfillment**: tabs "Retirada" / "Entrega" (radio cards com ícone)
   - Se entrega: campo CEP → ViaCEP preenche o restante → taxa de entrega exibida
3. **Resumo do pedido**: itens com foto, subtotal, frete, total
4. **Pagamento**: botão "Pagar com Mercado Pago" (abre Checkout Pro)

Nenhum campo redundante. Nenhum login obrigatório.

---

## Lead popup (first scroll)

- Aparece uma única vez por device (flag em `localStorage`).
- Trigger: usuário rola ~30% da home.
- Bottom sheet em mobile, modal pequeno em desktop.
- Copy: "Compre sua primeira peça com **5% de desconto no PIX**. Deixe seu e-mail."
- Input de e-mail + botão "Quero desconto".
- Fechar X descarta sem salvar (comportamento esperado pelo usuário).
- Sem verificação de e-mail no MVP; salva diretamente em `leads`.
- Nota: o desconto de 5% no PIX é aplicado manualmente ou via comunicação futura —
  no MVP o popup é de lead capture, não aciona nenhum cupom automático.

---

## WhatsApp FAB

- Posição: `fixed bottom-4 right-4` (mobile) / `fixed bottom-6 right-6` (desktop).
- Ícone WhatsApp verde (`#25D366`), rounded-full, 56×56px.
- Aparece após 1.5s na primeira visita.
- Link: `https://wa.me/${NEXT_PUBLIC_STORE_WHATSAPP}?text=Oi%2C%20preciso%20de%20ajuda!`
- Não mostrar na rota `/admin/**`.

---

## Página de desapego (`/desapegue`)

### Step 1 — Apresentação
Headline: "Seus filhos cresceram. As peças merecem um novo lar."
Sub: "Venda ou troque com a gente em 3 passos simples."
CTA: "Quero desapegar" → avança para step 2.

### Step 2 — Dados pessoais
Nome, telefone, e-mail (opcional).

### Step 3 — Sobre as peças
- Quantidade estimada de peças
- Descrição livre (textarea)
- Preferência: "Trago na loja" / "Envio pelos Correios"
- Upload de até 5 fotos (drag-and-drop + tap)

### Step 4 — Confirmação
Dados enviados, WhatsApp gerado automaticamente:
> "Olá! Me chamo [nome], tenho [qtd] peças para desapegar. [descrição curta]
> Prefiro [método]. Posso mandar mais fotos por aqui."
Botão: "Enviar pelo WhatsApp" → abre wa.me com texto pré-preenchido.

---

## Lições do Crescivoando (referência)

| Aproveitar | Evitar |
|---|---|
| Alerta "Atenção, peça única!" bem visível | Dropdowns de cor/tamanho com dezenas de opções (confunde peça única) |
| Medidas estruturadas na descrição (ombro, peito, manga, comprimento) | Mega-menu de departamentos com 3 níveis (complexidade desnecessária) |
| Foto do produto com fundo neutro e iluminação boa | Imagens tiny com CDN lento (placeholder vazios em flash) |
| "Produtos relacionados" por categoria próxima | Parcelamento exposto antes da confiança ser estabelecida |
| WhatsApp FAB persistente | Login obrigatório para ver preços |
| Atributos estruturados (Marca, Tamanho, Conservação, Cor) | CTA de "Comprar" inexplicavelmente `disabled` sem mensagem clara |
| Seção "Desconto exclusivo" (conceito) | Modal "Desconto exclusivo" com body vazio (bug real no Crescivoando) |
| Breadcrumb de navegação | Paleta genérica de plataforma (Nuvemshop roxo padrão) |
| Cálculo de frete na PDP | Instalamentos em primeiro plano na PDP antes de decidir a compra |
