
# Payouts v2: Holds, Splits & On-Demand Withdrawals

## Goals
1. Producers paid **biweekly** (1st & 15th); referrers paid **monthly** (1st).
2. **7-day return window** — funds sit in `pending_balance` until the window closes, then move to `available_balance`.
3. Producers AND referrers can **manually withdraw** any time `available_balance ≥ minimum`.
4. Every paid order splits revenue into: **producer net**, **platform commission** (system usage fee), **referrer commission** (if referred), with a clean ledger.

---

## 1. Money split on order paid

For each `order_item` when `orders.payment_status` flips to `paid`:

```
gross            = subtotal
platform_fee     = compute_platform_commission(gross)   ← system usage
referrer_fee     = compute_referrer_commission(product, gross)  ← if order has referrer
producer_net     = gross - platform_fee - referrer_fee
```

- Producer net → `wallet_balances.pending_balance` (held 7 days)
- Referrer fee → `referrer_wallet_balances.pending_balance` (held 7 days, also covers return)
- Platform fee → `platform_revenue` ledger

Existing `producer commission` (storewide/per-product) is renamed conceptually to **platform commission** since it's what the platform keeps. We'll keep the same UI controls but make the split explicit.

---

## 2. Schema changes (migration)

**`wallet_balances`** (producers) — already has `available_balance`. Add:
- `pending_balance numeric default 0` (if missing)
- `last_payout_at timestamptz`

**New `referrer_wallet_balances`**
- `referrer_id` (FK profiles), `available_balance`, `pending_balance`, `lifetime_earned`, `currency`, timestamps

**New `referrer_wallet_transactions`** — mirrors `wallet_transactions`.

**New `platform_revenue`** — ledger of system commission per order item.

**New `withdrawal_requests`**
- `user_id`, `user_type` ('producer' | 'referrer'), `amount`, `currency`, `status` ('pending' | 'processing' | 'paid' | 'failed' | 'rejected'), `paystack_transfer_code`, `bank_account_id`, `requested_at`, `processed_at`, `failure_reason`

**Extend `order_items`** with `platform_fee`, `referrer_fee`, `producer_net`, `referrer_id` (snapshot at order time), `funds_released_at`.

**Extend `platform_settings`** with `system_commission_type`, `system_commission_value`, `referrer_commission_type`, `referrer_commission_value`, `return_window_days` (default 7), `producer_min_withdrawal` (1000 KES), `referrer_min_withdrawal` (500 KES).

All new public tables get `GRANT`s + RLS (owner reads own wallet/withdrawals; admin reads all; service_role full).

---

## 3. Triggers & functions

- Rewrite `credit_wallet_on_order_paid` to:
  - compute the 3-way split,
  - write to `order_items` snapshot fields,
  - credit **pending** balances (producer + referrer),
  - record `platform_revenue`,
  - log ledger rows.

- New `release_held_funds()` SQL function:
  - For order_items where `payment_status='paid'` AND `now() - paid_at >= return_window` AND `funds_released_at IS NULL` AND no active return → move pending → available for both producer & referrer, stamp `funds_released_at`.

- On `returns` insert/approve → reverse the held amounts (debit pending, write reversal ledger row). If funds already released, debit available (can go negative → block withdrawals until covered).

---

## 4. Edge functions

- **`release-held-funds`** (cron: hourly) — runs `release_held_funds()`.
- **`biweekly-producer-payouts`** (cron: `0 9 1,15 * *`) — auto-batches producers ≥ min into Paystack transfers. Keeps existing weekly logic, just reschedule + rename.
- **`monthly-referrer-payouts`** (cron: `0 9 1 * *`) — same for referrers.
- **`request-withdrawal`** (user-invoked) — validates balance, creates `withdrawal_requests` row, immediately calls Paystack Transfer, decrements available → moves to a "processing" hold.
- **`paystack-transfer-webhook`** — extend to update `withdrawal_requests` and refund on failure (already handles producer wallet; add referrer branch).

Remove the old weekly cron entry.

---

## 5. Frontend

- **Producer `WalletTab`**: show Available / Pending (with "Released after 7-day return window") / Lifetime. Add **"Withdraw now"** button (disabled if < min or no bank account). Show withdrawal history.
- **Referrer dashboard**: new `ReferrerWalletTab` mirroring producer wallet, with bank setup + withdraw button. Monthly auto-payout note.
- **Admin `PayoutsManagement`**: tabs for Producers / Referrers / Withdrawal Requests. Manual approve/reject for pending withdrawals.
- **Admin Commissions settings**: edit system + referrer commission defaults and return window.
- **Order detail (producer view)**: show gross, platform fee, referrer fee, net, release date.

---

## 6. Open questions to confirm before build

1. **Default system commission rate?** (e.g. 5% of gross). Current per-producer "commission" — should I treat that existing value as the platform's system commission, or keep it producer-configurable and add a separate platform floor?
2. **Default referrer commission?** (e.g. 3% of gross, only when order has a referrer).
3. **Withdrawal minimums** — confirm 1000 KES (producer) / 500 KES (referrer).
4. **Return window starts when?** Order `paid_at` or `delivered_at`? (Delivered is fairer but needs a delivered timestamp on shipments.)
