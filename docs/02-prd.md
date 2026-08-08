# 02 — Requisitos do Produto (MVP)

## SLAs exibidos publicamente

| Tipo | Prazo |
|---|---|
| Retirada na loja | Pronta em até **4 horas úteis** (mesmo dia se pedido até 16h) |
| Entrega local (Foz do Iguaçu) | Em até **24 horas úteis** |
| Envio pelos Correios | Postado em até **1 dia útil** após confirmação do pagamento |
| Suporte (respostas) | Em até **1 hora** em horário comercial |

---

## Usuários e histórias

### Comprador (buyer)

| # | História | Critério de aceite |
|---|---|---|
| B1 | Como comprador, quero navegar no catálogo filtrando por tamanho, gênero, faixa etária, marca, conservação e preço para encontrar rapidamente o que serve. | Filtros na sidebar/drawer; URL reflete filtros ativos; resultados atualizados sem recarregar. |
| B2 | Como comprador, quero ver a página de um produto com fotos, tamanho, marca, condição e preço para decidir sem precisar perguntar. | PDP com gallery, badge "Peça única", campos estruturados, indicador de reserva ativa. |
| B3 | Como comprador, quero adicionar ao carrinho e ter a peça reservada por 20 minutos para não perder para outro comprador. | `cart_reservations` criado atomicamente; timer visível no carrinho; expiração libera o item. |
| B4 | Como comprador, quero preencher nome, telefone, CEP e escolher retirada ou entrega para finalizar o pedido. | Checkout em uma página; ViaCEP preenche endereço; opção entrega/retirada; todos obrigatórios. |
| B5 | Como comprador, quero pagar via Mercado Pago (PIX ou cartão) para confirmar o pedido. | Redirecionamento para MP Checkout; webhook confirma pagamento; pedido muda de status. |
| B6 | Como comprador, quero ver a página do meu pedido com status e prazo estimado. | `/pedido/[codigo]` com status atual, itens, SLA estimado e botão de suporte WhatsApp. |
| B7 | Como comprador, recebo um popup na primeira rolagem oferecendo desconto de 5% no PIX para deixar meu e-mail. | Popup aparece uma vez por sessão/dispositivo; e-mail salvo em `leads`; sem motor de cupom. |

### Lojista (storekeeper)

| # | História | Critério de aceite |
|---|---|---|
| S1 | Como lojista, quero ver pedidos pagos chegando em tempo real numa fila de fulfillment com badge e som. | `/admin/pedidos` com Supabase Realtime; badge no título da aba; badge no nav item. |
| S2 | Como lojista, quero clicar em "Conferir e separar" para confirmar que estou separando a peça, travando-a como vendida. | Botão move pedido para `confirmed`; item marcado `sold`; ação idempotente. |
| S3 | Como lojista, quero adicionar/editar produtos com fotos, tamanho, marca, condição e preço. | CRUD no admin; upload via Supabase Storage; campos obrigatórios validados. |
| S4 | Como lojista, quero importar um lote de produtos por planilha XLSX para cadastrar rápido o acervo inicial. | Template XLSX; parser Zod; feedback de linhas importadas/com erro. |
| S5 | Como lojista, quero gerenciar categorias e banners da home. | CRUD de categorias e banners no admin. |
| S6 | Como lojista, quero marcar um pedido como enviado (Correios) ou pronto para retirada. | Admin pode mover status; cliente vê atualização na página do pedido. |

### Lead de desapego

| # | História | Critério de aceite |
|---|---|---|
| D1 | Como pessoa que quer desapegar, quero preencher um formulário impressionante com fotos e dados das peças para iniciar o processo. | `/desapegue` multi-step com upload de fotos; formulário salvo em `intake_requests`; mensagem WhatsApp gerada automaticamente ao submeter. |

---

## Escopo do MVP — IN

- Catálogo público com filtros
- PDP com gallery e "peça única"
- Carrinho com reserva temporária (20 min TTL)
- Checkout: contato (nome + telefone), endereço (ViaCEP), entrega/retirada
- Pagamento Mercado Pago (PIX + cartão via Checkout Pro)
- Página pública do pedido (`/pedido/[codigo]`)
- Fila de fulfillment no admin com Realtime
- Admin: CRUD produtos, categorias, banners; import XLSX; gestão de pedidos
- Página "Desapegue Conosco" (formulário polished → WhatsApp handoff)
- Popup de lead capture (primeiro scroll, e-mail → 5% PIX)
- WhatsApp FAB flutuante no site público
- Auth de admin via Supabase Auth (email/senha)
- Deploy Vercel + Supabase Cloud

## Escopo do MVP — OUT

| Feature | Quando |
|---|---|
| Agente WhatsApp com IA | Pós-MVP |
| Motor de cupons | Pós-MVP; lead popup é soft (sem código real) |
| Área do cliente completa (histórico pleno) | Pós-MVP; portal Sacolinha mínimo = Slice O P1 (D103) |
| Multi-admin / permissões granulares | Pós-MVP |
| Notificações por e-mail automáticas | Pós-MVP (WhatsApp FAB cobre suporte) |
| Avaliações de produtos | Pós-MVP |
| Estoque avançado / controle de concorrência multi-loja | Fora |
| NF-e / fiscal | Fora |
| Marketplace / multi-vendedor | Fora |

## Fluxo principal (happy path)

```
Home → Catálogo (filtros) → PDP → [Adicionar ao Carrinho]
     → Carrinho (timer 20min) → Checkout (contato + endereço + fulfillment)
     → Mercado Pago → Webhook confirma → /pedido/[codigo]
                                          ↓
                               Admin: fila Realtime → Conferir e separar
                                          ↓
                               Status: em separação / pronto / enviado
```
