# Stripe në Render (prod) – 2 minuta

## Çfarë mjafton nga Stripe Dashboard

| Key | Ku shkon | E domosdoshme? |
|-----|----------|----------------|
| `sk_test_...` | **Render** → `STRIPE_SECRET_KEY` | ✅ Po |
| `pk_test_...` | **Vercel** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Opsionale (Checkout redirect) |
| `whsec_...` | **Render** → `STRIPE_WEBHOOK_SECRET` | Opsionale* |

\* Pa webhook, verifikimi funksionon pas pagesës (confirm-checkout). Webhook-i është për anulime automatike.

## Hapat në Render

1. [Render Dashboard](https://dashboard.render.com) → **albneti-api** → **Environment**
2. Shto `STRIPE_SECRET_KEY` = Secret key nga Stripe (sk_test_...)
3. **Save Changes** → **Manual Deploy** → Redeploy

## (Opsional) Vercel

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Publishable key (pk_test_...)

## Test

Kartë: `4242 4242 4242 4242` · data e ardhshme · CVC `123`
