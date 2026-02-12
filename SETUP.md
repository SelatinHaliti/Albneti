# Si të nisësh AlbNet

## 1. Backend

```bash
cd backend
cp .env.example .env    # nëse nuk ke .env
# Redakto .env: MONGODB_URI, JWT_SECRET, etj.
npm install
npm run start
```

Duhet të shikosh: `AlbNet backend në http://localhost:5000`

## 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # nëse nuk ke .env.local
# .env.local duhet të ketë: NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

Hap shfletuesin: http://localhost:3000

## Nëse porti 5000 është i zënë

- Në **backend/.env** vendose `PORT=5001`.
- Në **frontend/.env.local** vendose `NEXT_PUBLIC_API_URL=http://localhost:5001`.
- Rinisni backend dhe frontend.

Ose mbyllni procesin që përdor 5000: `lsof -ti:5000 | xargs kill -9`

## Nëse shfaqet "Nuk mund të lidhet me serverin"

- Backend duhet të jetë **nisur** para frontend-it.
- `PORT` në backend/.env duhet të përputhet me portin te `NEXT_PUBLIC_API_URL` (p.sh. 5001).
- Pas ndryshimit të .env.local, rinisni frontend-in (Ctrl+C, pastaj `npm run dev`).
