# Si ta konfigurosh Render (1 minutë)

## Metoda A – 1 klik (më e lehtë)

1. Dykliko: **`KONFIGURO-RENDER.bat`** (në rrënjën e projektit Albneti)
2. Hap linkun që shfaqet → **Create API Key** në Render
3. Kopjo `rnd_...` dhe ngjite në dritaren e bat
4. Prit 2–3 minuta → gati

---

## Metoda B – Manual në Render (pa API key)

1. Hyr në https://dashboard.render.com (Sign in me GitHub/Google)
2. Hap: **albneti-api** → tab **Environment** (jo Settings!)
   - Link direkt: https://dashboard.render.com/web/srv-d672kvvpm1nc739uuhjg/env
3. Kliko **"+ Add Environment Variable"** (butoni blu, jo "Add from .env")
4. Shto **një nga një** (Key = emri, Value = vlera):

| Key | Value |
|-----|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail-i yt |
| `SMTP_PASS` | Gmail App Password (pa hapësira) |
| `SMTP_FROM` | `AlbNet <gmail-i yt>` |
| `STRIPE_SECRET_KEY` | `sk_test_...` nga Stripe Dashboard |
| `FRONTEND_URL` | `https://albneti.vercel.app` |
| `AI_MARKETING_USE_SMART_ONLY` | `true` |
| `VAPID_PUBLIC_KEY` | nga `backend/.env` |
| `VAPID_PRIVATE_KEY` | nga `backend/.env` |
| `VAPID_SUBJECT` | `mailto:support@albneti.vercel.app` |

5. **Save Changes**
6. **Manual Deploy** → **Deploy latest commit**

---

## Kontrollo

Pas 2–3 min: https://albneti-api.onrender.com/api/health

Duhet:
```json
"smtpConfigured": true,
"stripeConfigured": true
```
