# Repeti Petit

Omnichannel platform for a kids' thrift store (brechó infantil) in Foz do Iguaçu:
single-stock inventory shared by online, physical store, and admin. Domain language
only — not implementation.

## Language

### Inventory & channels

**Peça**:
A unique thrift garment (quantity one). System row has an internal ID (UUID) from
creation for drafts/AI/review. Permanent staff code (`RP-000381`) is assigned only
when the Peça is **approved/activated for sale** (“ready for floor”); QR is minted
in that same step. Code never changes; customers need not see it.
_Avoid_: SKU (multi-qty), variant, assigning RP-… to drafts, reusing codes,
treating UUID as the staff-facing identity

**Single Inventory**:
One shared stock of Peças for online store, physical store, and admin. PostgreSQL
is the source of truth; realtime only mirrors that state.
_Avoid_: separate online vs store stock, duplicated catalogs

**Inventory Priority** (who wins a Peça):
1. Paid online order  
2. Completed physical store sale  
3. Online Hold Session  
4. Non-reserving shopping cart (if any)  
_Avoid_: treating Hold Session as sold; treating cart as a reservation

**Sold**:
Terminal inventory state — the Peça cannot be bought again. Channel of departure
is separate (`sold_channel` / sale record: online, store, later others).
_Avoid_: sold_online / sold_store as product statuses; encoding channel in status;
turning a sold Peça into inactive

**Inactive**:
A Peça that already entered sellable inventory (has or had floor identity) but was
intentionally withdrawn from sale without being sold (pulled, damaged, seasonal).
Not for draft/intake — drafts sit in review workflow without `RP-…` yet.
Slice N keeps this as a fourth inventory status; a later split into
status × visibility × lifecycle is preferred but out of Slice N.
_Avoid_: using inactive for “sold”; using inactive for never-activated drafts

**Sale**:
The transaction that took a Peça out of inventory. In Slice N this is an **Order**
(with `order_items`): `channel` online | store, payment provider accordingly
(Mercado Pago vs cash/card/pix at counter), `customer_id` nullable for store.
Creating an Order does **not** remove the Peça; inventory becomes **Sold** only
when the Order reaches a **paid** state — same guarantee online and in-store.
Packing/Sacolinha consume online paid Orders; store Orders feed Passport history,
analytics, Override audit.
_Avoid_: separate store_sales table in Slice N; conflating Sale with inventory status;
requiring Customer for every store Sale; marking sold on unpaid store draft orders

### Buyer & purchase

**Hold Session**:
Temporary TTL-bound reservation of up to **5** Peças in one shopping visit
(~**15–20 minutes**, visible countdown). Starts on **Comprar agora**;
customer may continue shopping; **one payment** closes the session. Does not enter
Sacolinha until paid. **Source of truth** for who/what/TTL/cancel/checkout link;
`products.status = hold` is only a fast projection for Passport/POS/realtime.
**Expiration is system-owned and automatic** — never depends on staff action.
Expire/cancel/convert must atomically clear session + set status back to available
(or sold on pay).
_Avoid_: Cart (as reservation), Sacolinha, wishlist, indefinite hold, treating
product status alone as the hold record; manual “expire holds” as the primary path

**Sacolinha**:
The one open inventory bag per Customer of **paid** Peças waiting for pickup or
delivery. New paid Hold Sessions add to that bag. Storekeepers track age/TTL to
nudge Customers on WhatsApp. Settle default ~30 days per payment package is
adjustable ops guidance, not a rigid engine yet.
_Avoid_: monthly subscription, consignação portal, pedido mensal, unpaid holds,
`order_type = 'sacolinha'` as this concept (enum label retired for writes — #123 / D113)

**Shopping Cart**:
Optional non-reserving staging only — **never** reserves inventory. Not the MVP
primary path (Hold Session is).
_Avoid_: calling Hold Session a cart; using cart to lock Peças

**Customer**:
A person who buys; persisted as a Customer row linked from Orders (`customer_id`).
Checkout always captures email (+ name/phone). Public order link `/pedido/[codigo]`
always works. Slice O P1: optional buyer magic-link Auth (not admin); merge anonymous
session → Customer; minimal Sacolinha panel. Staff packing queue remains source of
truth for store ops.
_Avoid_: Client, lead-as-customer; forcing Auth before payment; redirecting MP return
to a hard login wall (D103/D109)

**Discarded terms**:
consignação portal, Sacolinha-as-monthly-subscription, pedido mensal as Sacolinha
(D11 historical → D60/D101).

**Settle**:
Claiming Sacolinha contents via pickup or delivery; ops nudges if space is held too long.
_Avoid_: Complete (vague), cancel, refund

### Store operations

**Override**:
Physical sale may atomically cancel an online **Hold Session** or **pending_payment**
claim (cancel hold/pending order, notify customer, goodwill). Late payment webhooks
after Override must reconcile (cancel/refund + notify), never sell the Peça online.
Once **paid**, the Peça is untouchable — no Override. Every Override must leave a
minimal audit trail (Peça, hold/order affected, staff, time, reason) for ops,
support, and debugging — not a compliance platform.
_Avoid_: overriding paid online stock; silent cancel; trusting webhook order without
idempotency; unaudited overrides

**Garment Passport**:
QR on the Peça that opens the staff product record and quick actions (sell, edit,
return, archive, view status, reprint). Primary staff entry point — scan first
(device camera / browser), don’t search. Labels are printed at activation for
operational identity; prices are not printed on MVP labels.
_Avoid_: customer-facing barcode as identity; manual SKU lookup as default;
native scanner app as MVP requirement; full retail labeling/pricing system

**Intake Pipeline**:
Receive → photos + voice → AI draft → human review/approve → QR/label → floor.
AI drafts only; humans approve. Optimize for one touch per garment.
_Avoid_: autonomous AI publish; form-first bulk entry as the long-term ideal

**Cadastro em massa**:
Mobile-first capture loop for Intake Pipeline (formerly “Cadastro Rápido”): one
photo → optional voice note → next Peça, repeated as a series. Voice on mobile is
hold-to-record with slide-up to lock (WhatsApp-like); on desktop, tap to
start/stop. AI may draft in the background per item; the editable preview batch
appears only after the series ends. Then human corrects and prints labels
one-by-one. Same pipeline as admin AI intake; different capture UX. Single-item
CRUD may also record audio and “Processar” to fill form fields.
_Avoid_: waiting on AI between garments; multi-photo during the rapid loop;
generating the full preview before the series finishes

**Fila de Pedidos**:
Order-centric fulfillment view (paid → separate → handoff). Primary visual
anchors are purchase date/time and Customer name — not the public order code.
_Avoid_: leading with order number as the title; conflating with Hold Session

**Painel de Separação**:
Peça-centric ops grid (catalog-like) with badges for hold, sold-awaiting-pack,
separated-by-customer, etc., plus staff filters. Complements Fila de Pedidos;
mobile ops default lands here. Fulfillment **status** stays on the Order; each
sold Peça on an open fulfillment Order may have a staff **Separação check**
(`packed_at`) so pickers see done vs pending inside that Order — checks do not
auto-advance Order status.
_Avoid_: replacing the order queue entirely; treating this as the public catalog;
auto-confirming the Order when all items are checked; session-only checks as the
source of truth

**Central de Notificações**:
Staff ops radar (drawer): prioritized alerts for urgent delivery, new paid sale,
and Sacolinha nearing pickup deadline. Not a general system log.
_Avoid_: dumping holds, print failures, or config noise into the v1 drawer

### Discarded

Sacolinha-as-monthly-package / consignação (D11 → D60 → D101 → D113). Do not reintroduce.
Writes of `order_type = 'sacolinha'` are blocked in DB (#123); use `ORDER_TYPE_STANDARD`.
