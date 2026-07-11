# Njoftime Push – AlbNet

Njoftime në telefon **edhe jashtë app-it** (si Instagram): thirrje, mesazhe, ndjekës, etj.

---

## 1. Gjenero VAPID keys (një herë)

```bash
cd backend
npm install
node scripts/generate-vapid.js
```

Kopjo output-in:

| Variabël | Ku |
|----------|-----|
| `VAPID_PUBLIC_KEY` | Render (backend) |
| `VAPID_PRIVATE_KEY` | Render (backend) – **sekret, mos e vendos në frontend** |
| `VAPID_SUBJECT` | Render – p.sh. `mailto:support@albneti.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel (frontend) – **e njëjta si PUBLIC_KEY** |

---

## 2. Deploy

1. **Render** → albneti-api → Environment → shto VAPID_* (shiko `backend/.env` ose ekzekuto `scripts/setup-render-vapid.ps1` me `RENDER_API_KEY`)
2. **Vercel** → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` është në `frontend/.env.production` (deploy automatik)
3. **Redeploy** Render pas shtimit të VAPID_PRIVATE_KEY

---

## 3. Si funksionon për përdoruesin

1. Hyn në AlbNet → pas ~2 sek shfaqet **"Aktivizo njoftimet"** (shqip)
2. Prek **Aktivizo** → browser kërkon leje → **Lejo**
3. Merr njoftime kur:
   - Dikush **thërret** (edhe jashtë app-it)
   - **Mesazh** i ri
   - **Ndjekës** / pëlqim / koment
4. Prek njoftimin → hapet AlbNet në faqen e duhur

---

## 4. iPhone / Android

| Platformë | Kërkesa |
|-----------|---------|
| **Android Chrome** | Funksionon direkt në browser |
| **iPhone Safari** | Duhet **instaluar PWA** (Shto në Ekranin Kryesor) – iOS 16.4+ |
| **Desktop** | Chrome, Edge, Firefox |

---

## 5. Test

1. Dy llogari, aktivizo push në të dyja
2. Mbyll tab-in e përdoruesit B
3. Përdoruesi A dërgon mesazh ose thirrje
4. Përdoruesi B duhet të marrë njoftim në OS

---

## 6. API

| Endpoint | Përshkrim |
|----------|-----------|
| `GET /api/push/vapid-public-key` | Public key |
| `POST /api/push/subscribe` | Ruaj abonimin (auth) |
| `DELETE /api/push/subscribe` | Çabonim |
| `GET /api/push/status` | Statusi i përdoruesit |
