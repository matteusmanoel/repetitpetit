# ADR / Requirements Update — Inventory, Hold Sessions & Store Operations

## Vision

Repetit Petit is **not** a traditional e-commerce. It is an omnichannel platform for a children's thrift store with **single-stock inventory** (every piece is unique).

The software should optimize for **operational efficiency**, minimizing the number of times a staff member touches a garment while maintaining a consistent inventory across both online and physical sales channels.

The application should be designed around **workflows (pipelines)** instead of CRUD forms.

---

# Delivery slices

## Slice N (now) — D63

- Hold Session refactor (TTL, multi-item, one payment)
- Idempotent Override + late webhook reconciliation
- Minimal POS sell (via `orders` channel=store — D68)
- QR generation/printing + scan-to-open Garment Passport
- Keep existing paid → packing queue as-is (no Sacolinha/category pick UX expansion)
- Customer row + email at checkout; **no** buyer login / Sacolinha panel (D69)

## Slice N+1 (next)

- Deepen packing: group by Customer / Sacolinha, category-aware pick lists
- Customer/pickup notification polish
- AI-assisted intake (photos + voice → draft)
- Batch review (accept / edit / reject / merge)

## Slice N+2 (later)

- Magic-link buyer login
- Customer Sacolinha panel, addresses, purchase history

Packing polish waits until Peça identity + store sell path are stable. AI improves
efficiency; QR identity is foundational and ships in Slice N. Buyer portal waits
until Orders/Customers/Peça identity are stable.

---

# Core Business Principles

## Single Source of Truth

- PostgreSQL remains the source of truth.
- There is only one inventory shared by:
  - Online store
  - Physical store
  - Admin panel

No duplicated inventory.

---

## Inventory Priority

Business precedence:

1. Paid online order
2. Completed physical store sale
3. Online Hold Session
4. Shopping Cart (no reservation)

### Implications

- Shopping carts never reserve inventory.
- Hold Sessions temporarily reserve inventory.
- Paid orders permanently reserve inventory.
- Physical store may override temporary holds.
- Paid online orders cannot be overridden.

---

## Hold Session (MVP)

Primary customer journey:

```text
Browse
    ↓
Comprar Agora
    ↓
Hold Session begins
    ↓
Continue shopping (optional)
    ↓
Reserve up to 5 items
    ↓
Single checkout
    ↓
Payment
    ↓
Sacolinha
```

### Rules

- Max 5 items
- TTL 15–20 minutes
- Visible countdown
- Automatic expiration (**system-owned** — never staff-dependent)
- One payment per Hold Session
- Sacolinha contains only paid items

### Expiration ownership (MVP — D70)

Hold Session remains source of truth; `products.status = hold` remains projection.

Preferred MVP: **Supabase scheduled trigger → Edge Function** (no external
workers / queue infra).

Process must atomically:

1. Find expired Hold Sessions
2. Mark Hold Session `expired`
3. Release associated Peças
4. Set `products.status` from `hold` → `available`
5. Let realtime reflect the committed DB state

---

# Omnichannel Conflict Resolution

Physical store has operational priority over temporary online holds.

When a cashier scans an item:

## Available

Allow sale.

## Hold Session or pending_payment

Display warning (hold countdown and/or “pagamento online em andamento”).

Store may override.

If overridden (atomic):

- Cancel hold and/or cancel/expire the pending order
- Notify online customer
- Grant goodwill benefit (voucher/store credit)
- If no payment was captured: nothing to refund
- If a **late Mercado Pago webhook** arrives after override: idempotent reconcile
  (cancel/refund + notify) — never mark the Peça paid/sold online
- **Minimal audit trail** (D72): Peça, Hold Session and/or pending Order, staff,
  timestamp, reason/context — ops/support/debug only, not a compliance platform

## Paid (payment confirmed)

Block sale. Untouchable — no override.

Display:

> Already sold online.

## Sold (store or online)

Block sale.

---

# Physical Product Identity

Every garment row has an **internal UUID** from creation (drafts, AI, review —
system only).

When the Peça is **approved/activated for sale** (“ready for floor”), it receives
a permanent staff identifier and QR in the same step:

```text
RP-000381
```

- `RP-…` never changes and is not assigned to drafts
- Customers do not need to see it
- Staff rely on it (scan / Passport)
- UUID remains the database primary key; `RP-…` is the floor identity

---

# QR Code Strategy

Instead of traditional barcodes, generate QR labels automatically on activation
(approval for sale), not while the record is still a draft.

Together at activation (D64 / D73):

- Assign permanent `RP-…`
- Generate QR that permanently identifies the Peça
- Generate printable label

### MVP printing (D73)

- Thermal printer output when available
- PDF fallback printing
- **Do not** print fixed prices on labels initially (price lives on Passport screen)
- No native scanner app — device camera / browser admin is enough
- Goal: operational identity, not a full retail labeling system

QR may contain:

- Product ID / `RP-…`
  or
- Direct admin/product URL

Scanning should immediately open the product record.

No searching.

No manual SKU lookup.

---

# Staff-First Philosophy

Every operational task should begin with scanning the product.

Scanning a QR should expose:

- Images
- Product information
- Current price (on screen, not on MVP label)
- Status
- Hold countdown (if applicable)
- Inventory location (future)
- Quick actions

Examples:

- Sell
- Edit
- Return
- Archive
- View status
- Reprint label

The QR becomes the physical passport of the garment.

---

# Store POS payment completion (D68 / D71)

- Reuse `orders` + `order_items` (`channel = store`).
- Creating a store Order does **not** mark inventory `sold`.
- Inventory → `sold` only when the Order reaches **paid**.
- Store payment methods: cash / card / Pix without Mercado Pago Checkout Pro.
- The paid → sold transition must preserve the same consistency guarantees as
  online checkout.

---

# Intake Pipeline

Current retail workflow should be replaced with an AI-assisted pipeline.

Goal:

Touch every garment once.

Pipeline:

```text
Receive clothing
        ↓
Take multiple photos
        ↓
Record voice descriptions
        ↓
Upload
        ↓
AI processing
        ↓
Review
        ↓
Approve
        ↓
Generate QR
        ↓
Print labels
        ↓
Place on sales floor
```

---

# AI Processing

Input:

- Multiple images
- Voice recordings

Processing:

- Speech-to-text
- Vision understanding
- Structured extraction

Expected output:

```json
{
  "title": "",
  "category": "",
  "brand": "",
  "size": "",
  "condition": "",
  "color": "",
  "priceSuggestion": 0,
  "description": "",
  "tags": [],
  "images": []
}
```

The AI creates drafts only.

Humans remain responsible for approval.

---

# Batch Review Experience

Avoid forms.

Present AI results as editable product cards.

Example actions:

- Accept
- Edit
- Reject
- Merge
- Duplicate

Batch approval should create all products simultaneously.

---

# Product Lifecycle

Keep **inventory availability** separate from **intake workflow** and **sale channel**.

## Inventory status (catalog / POS)

```text
available  →  hold  →  sold
     │
     └────→  inactive   (withdrawn, not sold)
```

- Hold Session (+ items) = **source of truth** (who, TTL, multi-item, cancel, checkout)
- `products.status = hold` = **projection** for Passport / POS / realtime
- Expire / cancel / override / pay: one transaction updates session **and** status
- `sold` = gone; channel on the **Sale** (`online` | `store` | future) — D65
- `inactive` = was sellable inventory, pulled from sale without selling — D67
  (later: split status × visibility × lifecycle; not in Slice N)
- Drafts / AI review: workflow states, no `RP-…`, not this enum yet
- **Sale aggregate (Slice N):** `orders` + `order_items` for both channels (D68);
  store POS creates order without Mercado Pago; customer nullable

## Intake / ops stages (may be columns or a separate workflow state)

```text
NEW → AI_PROCESSING → DRAFT → READY_FOR_REVIEW → ACTIVE (sellable)
```

ACTIVE assigns `RP-…` + QR. Drafts use UUID only.

## After sold (later slices)

`RETURNED` / `ARCHIVED` are post-sale ops — not extra “sold channel” statuses.

---

# Real-Time Synchronization

All inventory changes should propagate in real time.

Events include:

- Hold created
- Hold expired
- Hold cancelled
- Product sold online
- Product sold in store
- Product returned
- Price updated

Frontend should subscribe to inventory events instead of polling.

Supabase Realtime is sufficient for MVP.

---

# Suggested Technical Architecture

## Current stack

- Next.js
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Vercel

Remain unchanged.

No migration to NoSQL or GraphQL is required.

---

## Concurrency

Inventory consistency must rely on PostgreSQL transactions.

Typical flow:

```text
Create Hold
        ↓
Lock product row
        ↓
Validate availability
        ↓
Create reservation
        ↓
Commit
        ↓
Broadcast realtime update
```

Realtime reflects database state.

It never determines ownership.

---

# Admin Dashboard

Instead of database tables, prioritize operational dashboards.

Suggested widgets:

- 🟢 Available
- 🟡 Online Hold
- 🔴 Sold Online
- 🟣 Sold In Store
- ⚫ Missing
- 🔄 Returns
- ⏱ Holds expiring soon

Each card exposes contextual quick actions.

---

# Long-Term Product Direction

The platform should feel purpose-built for thrift operations rather than a generic e-commerce.

Design principles:

- Optimize employee workflows before administrative workflows.
- Replace repetitive data entry with AI-assisted review.
- Minimize touches per garment.
- Use QR scanning as the primary interaction model.
- Keep a single shared inventory across channels.
- Resolve omnichannel conflicts explicitly rather than hiding them.
- Prefer operational simplicity over architectural complexity.
- Treat AI as a productivity multiplier for staff—not as an autonomous decision maker.
- Keep PostgreSQL as the authoritative source of truth while using realtime only for synchronization.

This direction establishes a scalable operational foundation capable of supporting future features such as dynamic pricing, inventory analytics, customer recommendations, warehouse/rack management, mobile staff applications, and eventually a fully integrated omnichannel checkout experience.
