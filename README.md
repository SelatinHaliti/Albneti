# AlbNet

Platformë sociale full-stack në gjuhën shqipe, e frymëzuar nga Instagram. Modern, e shkallëzueshme dhe e sigurt.

**Versioni final** me logjikë si Instagram: [VERSION-FINAL.md](./VERSION-FINAL.md)

## Teknologji

- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, Zustand
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT, Socket.io, Cloudinary

## Funksione (version i avancuar – si Instagram)

- **Regjistrim / auth:** Kyçje, verifikim email, reset fjalëkalimi
- **Feed:** Pagination me **cursor** (si Graph API), dropdown **Për ty / Ndiqet**, pull-to-refresh, prefetch 400px, trajtim gabimesh + “Provo përsëri”
- **Story:** 24 orë, progress bars, tap majtas/djathtas, **Fundi / Kryesor**, unazë story në profilin e përdoruesit
- **Reels:** Video që luajnë me **key** + **play()** në `loadeddata`/`canplay`, pause kur tab fshihet, **cursor + load more**, swipe dhe wheel
- **Profil:** Redaktim (ruajtje), postime / ruajturat / tagged / **arkivuara**, buton Mesazh, unazë story në avatar kur ka story
- **Postime:** CRUD, redakto/arkivo/fshi, komente (fshi/ndrysho), meny “Më shumë”, ndaj me kopjo link
- **Njoftime:** Badge i palexuarave mbi ikonën, shënim si të lexuar
- **Kërkim:** Historik + sugjerime
- **Chat global shqiptar:** Socket + REST fallback, load more, moderim
- **Mesazhe:** Bisedë e re me `?username=`, Socket.io
- **Admin:** Bllokim, raportet
- **Avancuar:** Toast global (Ruajtuar, Linku u kopjua), optimistic updates (like, save, follow), Error Boundary, API me timeout 30s, health check me DB, skeleton components

## Struktura

```
albnet/
├── backend/          # API Express + Socket.io
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   └── utils/
├── frontend/         # Next.js App Router
│   ├── app/
│   ├── components/
│   ├── store/
│   └── utils/
├── DEPLOY.md         # Udhëzime deploy (Vercel + Render/Railway)
└── README.md
```

## Fillimi i shpejtë (lokalisht)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Plotëso .env (MONGODB_URI, JWT_SECRET, Cloudinary, etj.)
npm install
npm run dev
```

Backend-i në: `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# Vendos NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

Frontend-i në: `http://localhost:3000`

### 3. MongoDB

Vendos një MongoDB lokalisht ose përdor [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) dhe vendos `MONGODB_URI` në `.env` të backend-it.

### 4. Cloudinary

Krijo llogari në [Cloudinary](https://cloudinary.com) dhe shto credentialet në `.env` të backend-it për upload të fotove dhe videove.

## API (përmbledhje)

- `POST /api/auth/regjistrohu` – Regjistrim
- `POST /api/auth/kycu` – Kyçje
- `GET /api/users/:username` – Profil
- `PUT /api/users/profili` – Përditëso profilin (multipart për avatar)
- `GET /api/posts/feed` – Feed
- `POST /api/posts` – Krijo postim (multipart)
- `GET /api/stories` – Story aktive
- `POST /api/stories` – Krijo story (multipart)
- `GET /api/messages` – Lista bisedash
- `GET /api/messages/conversation/:id` – Mesazhet e një bisede
- `GET /api/notifications` – Njoftime
- `GET /api/explore/postime` – Explore
- `GET /api/explore/hashtag-trending` – Hashtag trending
- Admin: `/api/admin/stats`, `/api/admin/raportet`, `/api/admin/perdoruesit`, etj.

Të gjitha rrugët e mbrojtura kërkojnë header: `Authorization: Bearer <token>`.

## Deploy

Shiko **DEPLOY.md** për hapa të hollësishëm për Vercel (frontend) dhe Render ose Railway (backend).

## Licensa

Projekt edukativ / portfolio.
# Albnet
