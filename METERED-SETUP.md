# Metered.ca – Konfigurim për thirrje AlbNet

## Çfarë është Metered?

**Metered.ca** ofron **TURN/STUN server** për thirrjet audio/video në AlbNet.

Kur dy përdorues janë në **rrjete të ndryshme** (WiFi, 4G, NAT, firewall), browser-i nuk mund t’i lidhë direkt. TURN serveri **relay-on** audio/video midis tyre – pa të, thirrjet shpesh dështojnë edhe pse signaling (socket) funksionon.

Llogaria jote: [Metered Dashboard](https://dashboard.metered.ca/dashboard/app/6a529bebac88d78a77912725)

---

## Hapat në Dashboard (bëji një herë)

### 1. Krijo kredencial TURN

1. Hyr në dashboard → **TURN Server** (ose **Credentials**)
2. Kliko **Generate your first credential** (ose **Add Credential**)
3. Jep një emër p.sh. `albneti-prod`

### 2. Merr App Name dhe API Key

1. Te kredenciali që krijove, kliko **Instructions** (ose **Show API Key**)
2. Kopjo:
   - **App name** – p.sh. `albneti` (pjesa para `.metered.live` në URL)
   - **API Key** – çelësi i kredencialit (i shkurtër, scoped për TURN)

Shembull URL API:
```
https://albneti.metered.live/api/v1/turn/credentials?apiKey=YOUR_KEY
```
→ `METERED_APP_NAME=albneti`

### 3. Vendos në Render (backend prod)

Hyr te [Render Dashboard](https://dashboard.render.com) → shërbimi **albneti-api** → **Environment** → shto:

| Variabël | Vlera |
|----------|--------|
| `METERED_APP_NAME` | emri i app-it nga Instructions (p.sh. `albneti`) |
| `METERED_TURN_API_KEY` | API Key nga credential |
| `METERED_TURN_REGION` | `global` ose `europe` (opsional, default `global`) |

**Ruaj** → **Manual Deploy** (ose prit redeploy automatik).

> **Mos vendos** Secret Key nga Developers në frontend – vetëm në backend nëse përdor API të tjera. Për thirrje mjafton **TURN Credential API Key**.

### 4. Lokal (opsional – testim)

Në `backend/.env` (gitignored):

```env
METERED_APP_NAME=albneti
METERED_TURN_API_KEY=your-credential-api-key
METERED_TURN_REGION=europe
```

---

## Si funksionon në AlbNet

1. Përdoruesi fillon thirrje → frontend kërkon `GET /api/calls/ice-servers` (me JWT)
2. Backend merr kredenciale **dinamike** nga Metered API
3. `RTCPeerConnection` përdor ato ICE servers → lidhja kalon NAT/firewall

Nuk duhen variabla `NEXT_PUBLIC_TURN_*` në Vercel nëse backend-i është konfiguruar si më sipër.

---

## Test pas konfigurimit

1. Render: verifiko që env vars janë ruajtur
2. `GET https://albneti-api.onrender.com/api/calls/ice-servers` (me token login) → duhet `source: "metered"`
3. Dy përdorues në rrjete të ndryshme → thirrje audio nga Mesazhe → **Prano** → duhet të dëgjohen

---

## Plani falas Metered

Plani falas ka **kuota bandwidth** për TURN relay. Për rrjet social në rritje, monitoro **Usage** në dashboard dhe upgrade nëse duhet.

---

## Probleme të zakonshme

| Problem | Zgjidhje |
|---------|----------|
| `Invalid API Key` | Kopjo sërish API Key nga Instructions, jo Secret Key |
| `source: "fallback"` në API | `METERED_APP_NAME` ose `METERED_TURN_API_KEY` mungon në Render |
| Thirrja lidhet por pa zë | Lejo mikrofon në browser; provo me kufje |
| Vetëm një drejtim funksionon | Rregullo TURN – pa Metered, OpenRelay shpesh dështon |
