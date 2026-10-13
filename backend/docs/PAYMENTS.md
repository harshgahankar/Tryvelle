# Razorpay test-mode payments

Demo checkout is untouched. Real-money path (test keys only until approved):

1. Paste **test** keys into `backend/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. Checkout → choose **Pay online (TEST MODE)** → Razorpay window (UPI/cards) → verify → confirmation.
3. Money flow: `POST /orders/razorpay-intent` creates a `pending_payment` order (no stock moves) + Razorpay order; `POST /orders/verify` checks the HMAC signature and captures stock atomically (idempotent); `POST /webhooks/razorpay` reconciles `payment.captured` events (also idempotent).
4. Statuses: `pending_payment` → `paid` → admin `demo_confirmed` → `demo_completed`. Paid cancels restore stock; refunds are manual in the Razorpay dashboard (test mode).
5. Without keys, intent returns `GATEWAY_NOT_CONFIGURED` with setup instructions — never a silent failure.

Test cards/UPI: use Razorpay's test credentials from their docs (no real money). Webhook local testing needs a public tunnel URL registered in the dashboard; the verify endpoint already covers the happy path without one.
