# Udhëzime për Deploy - AlbNet

Ky dokument përshkruan hapat për të vendosur AlbNet në production (Vercel + Render/Railway).

---

## 1. Backend (Render ose Railway)

### Render

1. Krijo një **Web Service** të ri në [Render](https://render.com).
2. Lidhe repozitorin tënd GitHub.
3. **Build Command:** `cd backend && npm install`
4. **Start Command:** `cd backend && npm start`
5. **Environment:**
   - `NODE_ENV=production`
   - `MONGODB_URI` = connection string nga MongoDB Atlas
   - `JWT_SECRET` = një string të rastësishëm të fuqishëm
   - `FRONTEND_URL` = URL e frontend-it (p.sh. `https://albnet.vercel.app`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - (Opsional) Variablat SMTP për email

6. Render do të japë një URL për backend-in (p.sh. `https://albnet-api.onrender.com`).

### Railway

1. Krijo projekt të ri në [Railway](https://railway.app).
2. Shto **GitHub Repo** dhe zgjidh dosjen `backend` si root (ose vendos Root Directory: `backend`).
3. Shto variablat e mjedisit (si më lart).
4. Railway do të bëjë deploy dhe do të japë një URL.

### MongoDB Atlas

1. Krijo cluster në [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Database Access → krijo përdorues me fjalëkalim.
3. Network Access → shto `0.0.0.0/0` për të lejuar nga çdo IP (ose vetëm IP e shërbimit të backend-it).
4. Kopjo connection string dhe përdore si `MONGODB_URI` (p.sh. `mongodb+srv://user:pass@cluster.mongodb.net/albnet`).

### Cloudinary

1. Regjistrohu në [Cloudinary](https://cloudinary.com).
2. Nga Dashboard merr: Cloud Name, API Key, API Secret.
3. Vendosi në variablat e mjedisit të backend-it.

---

## 2. Frontend (Vercel)

1. Regjistrohu në [Vercel](https://vercel.com) dhe lidhe repozitorin GitHub (p.sh. `SelatinHaliti/Albnet`).
2. **Root Directory (shumë i rëndësishëm):** duhet të jetë **`frontend`**.  
   - Nëse e lini bosh, Vercel ndërton nga rrënja e repozitorit dhe merrni **404: NOT_FOUND**.  
   - Vercel Dashboard → Projektin → **Settings** → **General** → **Root Directory** → **Edit** → shkruani `frontend` → **Save**.
3. **Framework Preset:** Next.js (zbulohet automatikisht kur root është `frontend`).
4. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = URL e backend-it (p.sh. `https://albnet-api.onrender.com`)

5. Kliko **Deploy**. Nëse keni pasur 404, bëni **Redeploy** pasi të keni vendosur Root Directory në `frontend`.

---

## 3. Pas deploy

- **CORS:** Backend-i përdor `FRONTEND_URL` për CORS; sigurohu që është saktë (pa slash në fund).
- **Cookies:** Në production, cookie për JWT duhet të jetë `secure: true` dhe `sameSite: 'lax'` (tashmë është në kod sipas `NODE_ENV`).
- **Socket.io:** Klienti lidhet me `NEXT_PUBLIC_API_URL`; sigurohu që Render/Railway mbështet WebSockets (zakonisht po).

---

## 4. Përdoruesi i parë admin

Për të pasur një përdorues admin, në MongoDB (Atlas ose lokalisht) ndërroje fushën `role` të dokumentit të atij përdoruesi nga `user` në `admin`:

```javascript
db.users.updateOne(
  { email: "emaili@i_regjistruar.com" },
  { $set: { role: "admin" } }
)
```

Pas kësaj, ky përdorues mund të hyjë në `/admin` për panelin e administrimit.
