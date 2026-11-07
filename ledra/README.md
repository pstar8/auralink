# AuraLink — seller dashboard (front end)

The seller side of the Busha Build Day build: one payment link per order, a dashboard that
shows what is actually happening, a ledger that fills itself, and a statement a lender can read.

Everything runs on mock data that lives in `localStorage`, so you can click through the whole
story with no backend, no keys and no internet. When Azeez's API is ready, there is one file to
change (see **Swapping in the real API**).

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Node 20+. Next.js 15, React 19, TypeScript. No CSS framework, no chart library, no UI kit.

Useful commands:

```bash
npm run build      # production build, also type-checks
npm start          # serve the build
```

To wipe the demo back to seed data: avatar menu (top right) → **Reset demo data**, or clear
`AuraLink.state.v1` from `localStorage`.

---

## The pages

| Route | What it does |
| --- | --- |
| `/` | Dashboard. Collected today, open links, exceptions, payment success rate, balance card with Withdraw / Receive / Convert, collections chart, the payments that need a decision, latest orders. |
| `/orders` | Orders list with filter pills (All, Awaiting, Paid, Needs attention, Expired), search, sort, CSV export. Row opens the order detail dialog. |
| `/orders?new=1` | Opens the New order dialog straight away. Deep links also support `?q=sarah` and `?order=ORD-2401`. |
| `/ledger` | Every confirmed payment as one line: amount received, naira value at settlement, Busha fee, net, status, event id. Flagged only filter, range filter, CSV export. |
| `/summary` | Month-end statement: revenue, average order value, success rate, repeat buyers, daily collections, top buyers, channel split. Print / PDF button. |
| `/shield` | Screenshot Shield. Drop a transfer screenshot, correct what the reader extracted, get a green, amber or red verdict with the next action. |
| `/products` | Catalogue with stock levels. Feeds the New order dialog and blocks sold-out items. |
| `/notifications` | Everything that happened, grouped by day. |
| `/pay/[ref]` | The buyer's page. Amount, countdown, one network only for USDC with the warning above the button, naira account details, receipt, expired and cancelled states, invalid-link state. |

Dialogs: New order (form, validation, success screen with copy and share), order detail (timeline,
copy link, sandbox tools, cancel, issue a fresh link), withdraw, receive, convert, confirm
cancellations.

## Errors and edge cases that are wired up

- **Form validation** with inline messages and a toast: missing customer, no product, discount
  bigger than the order, quantity above available stock, USDC link under ₦500.
- **Out of stock** is blocked inside the product picker and rejected again server-side by the mock
  API, so the message the seller sees is the same shape you will get from the real API.
- **Link expired**: the countdown runs down and the order flips to expired on its own. The pay page
  then refuses payment and explains what happened.
- **Cancelled link**: pay page shows a blocked state.
- **Invalid reference**: `/pay/nonsense` shows a "this link is not valid" page with a scam warning.
- **Short payment**: arrives as underpaid, with the outstanding balance and what to do next.
- **Late payment**: arrives as late paid, and asks the seller to confirm the price.
- **Copy to clipboard fails** (embedded frames block it): falls back to `execCommand`, then tells
  the user to copy by hand instead of failing silently.
- **Wrong file type / oversized screenshot** on Shield, with the reason.
- **Empty states** everywhere, different copy for "nothing yet" and "nothing matches your search".
- **Withdraw more than the balance**, no amount, below the ₦100 floor.
- **Toasts** are hidden on the buyer's pay page on purpose, so buyers never see seller chatter.

## Demo path (about 60 seconds)

1. `/` — point at the exceptions card: one short payment, one late payment, and the balance.
2. Create a link: name, product, quantity, Create link, copy it.
3. Open the pay page in a second tab, pay it, watch the receipt.
4. Back on the dashboard, the order is paid and a ledger line appeared.
5. `/ledger` — export the CSV.
6. `/shield` — "A fake alert" and let the room watch it turn red.
7. `/summary` — print to PDF. That is the lender-ready statement.

## Swapping in the real API

Every call the UI makes goes through `lib/api.ts`. Each function is async and already has the
right input and output shape. Replace the body with a fetch and nothing else in the app changes:

```ts
async createOrderLink(input: CreateOrderInput): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError((await res.json()).message, 'create_failed');
  return res.json();
}
```

Keep `ApiError` as the error type and every message the seller sees keeps working, because
`errorMessage()` in `lib/store.tsx` already unwraps it.

The store (`lib/store.tsx`) is the only place that holds state. The webhook equivalent today is
`payOrder(orderId, amountNgn)`. When the real webhook lands, call the same state update from a
Supabase realtime subscription or a polling refresh, and the entire UI follows.

### Shape mapping to the data model in the build brief

| Brief table | Front end type (`lib/types.ts`) |
| --- | --- |
| `orders` | `Order` (id, customer, items, total, status, ref, expires_at) |
| `payments` | `LedgerEntry.bushaEventId` is the idempotency guard you described |
| `ledger` | `LedgerEntry` (amount received, naira value, fee, net, status) |

Order states implemented: `awaiting`, `paid`, `underpaid`, `expired`, `late_paid`, `cancelled`.
The state machine in `lib/store.tsx` (`payOrder`) is the one that decides paid vs underpaid vs late.

## File map

```
app/
  layout.tsx                 store provider, toasts, global CSS
  (app)/layout.tsx           sidebar + top bar shell
  (app)/page.tsx             dashboard
  (app)/orders/page.tsx      orders
  (app)/ledger/page.tsx      ledger
  (app)/summary/page.tsx     statement
  (app)/shield/page.tsx      screenshot shield
  (app)/products/page.tsx    catalogue
  (app)/notifications/page.tsx
  pay/[ref]/page.tsx         buyer payment page
components/
  AppShell.tsx               sidebar, search, notifications popover, user menu
  CreateOrderModal.tsx       new order form + success screen
  OrderDetails.tsx           order dialog, timeline, sandbox tools
  BalanceCard.tsx            balance + withdraw / receive / convert
  charts.tsx                 area, bar, sparkline, horizontal bars (hand-rolled SVG and CSS)
  ui.tsx                     buttons, modal, toasts, chips, fields, empty states
lib/
  api.ts                     SINGLE SWAP POINT for the backend
  store.tsx                  state, order logic, toasts, clock, localStorage
  mock.ts                    seed data (products, customers, 150 days of orders)
  types.ts                   types + status metadata
  config.ts                  brand name, seller details, fees, rate, quote window
  format.ts, csv.ts          money, dates, countdowns, downloads
```

## What is honestly mocked (say this to the judges)

- No Busha API calls yet. Links are generated locally, and payments arrive through the
  **Sandbox tools** button inside any order, which is the stand-in for Busha's webhook.
- The screenshot reader returns deterministic numbers instead of calling Gemini. The manual field
  entry is the real fallback path and it works today.
- Balances, the virtual account number and the USDC address are placeholders.

Rename the product in `lib/config.ts` (currently `AuraLink`) and every screen follows.
