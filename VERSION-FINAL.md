# AlbNet – Version Final (logjikë si Instagram + avancuar)

Ky dokument përshkruan versionin e përfunduar dhe **më të avancuar** të AlbNet: logjikë si Instagram plus përmirësime frontend/backend (toast, optimistic updates, error boundary, health check, timeout API, skeleton).

---

## 1. Feed (Kryefaja) – identik me Instagram

| Veçori | Si funksionon |
|--------|----------------|
| **Pagination** | Me **cursor** (si Graph API): `GET /api/posts/feed?limit=12&cursor=...`. Përgjigjja: `posts`, `hasMore`, `nextCursor`. |
| **Kryefaja / Ndiqet** | Klik mbi logo (mobil majtas, desktop sidebar) hap dropdown: **Për ty** (Kryefaja), **Ndiqet** (Following – chronological). URL: `/feed` dhe `/feed?feed=following`. |
| **Story vetëm në Kryefaja** | Si te Instagram: në pamjen **Ndiqet** (Following) **nuk shfaqet** rreshti i Story – vetëm postime. |
| **Pull-to-refresh** | Tërheqje poshtë në krye → rifreskim feed + story. |
| **Load more** | IntersectionObserver me `rootMargin: 400px` (prefetch). Ngarkon faqen tjetër kur përdoruesi afrohet. |
| **Gabime** | Mesazh + **Provo përsëri** (fillim ose gjatë scroll). |
| **Story** | Rreshti i story-ve sipër (Storya ime / Shto story + të tjerët). Toggle **Fundi** / **Kryesor**. |

---

## 2. Story – identik me Instagram

| Veçori | Si funksionon |
|--------|----------------|
| **24 orë** | Story-t skadojnë pas 24 orësh (backend `expiresAt`, TTL). |
| **Story viewer** | Klik mbi një story → faqja `/story/[userId]`. |
| **Progress bars** | Shirita sipër (një për çdo story). Për **foto**: timer 5s. Për **video**: `onTimeUpdate` → progress = currentTime/duration. |
| **Tap majtas/djathtas** | Klik e shkurtër majtas = story/përdorues para; djathtas = pas. |
| **Mbaj (hold) = pause** | Si te Instagram: **mbaj gishtin** mbi ekran → story ndalet (timer për foto, video pause). Lësho → vazhdon. |
| **Navigim** | Video: kalim automatik në `onEnded`. |
| **Unaza në profil** | Profili i të tjerëve me story aktive: avatar me unazë gradient, link te `/story/[userId]`. |

---

## 3. Reels – identik me Instagram

| Veçori | Si funksionon |
|--------|----------------|
| **Video** | Një video për reel. `key={reel._id}`; `onLoadedData`/`onCanPlay` → `play()`; `preload="auto"`. |
| **Tap në video** | **Një tap** = ndërron zërin (mute/unmute). **Dy tap** = pelqim + animacion zemër (si Instagram). |
| **Swipe** | Swipe lart/poshtë (touch) për reel tjetër/para; nëse lëvizja < threshold = tap (mute ose double-tap like). |
| **Pause kur tab fshihet** | `visibilitychange` → pause; përsëri e dukshme → play. |
| **Pagination** | Cursor: `GET /api/posts/reels?limit=12&cursor=...`. Load more kur afrohet fundi. |
| **Swipe / wheel** | Wheel (desktop) për reel para/pas. |
| **Zëri** | Default muted; toggle me butonin ose **tap në video**. |
| **Gabime** | Mesazh + **Provo përsëri**; varësia nga `user` për fetch. |
| **Avancuar** | **Optimistic like/save** (rollback + toast në gabim). **Ruaj** (bookmark) si Instagram. **Pull-to-refresh** në reel të parë (tërhiq poshtë). **Shirit progresi video** sipër (currentTime/duration). **Badge muzikë** nëse reel ka `music.title`. **Keyboard**: Arrow Up/Down për reel para/pas. **Swipe vs tap**: lëvizje &lt; threshold = tap (mute ose double-tap like). Backend: `getReels` kthen edhe `saved` dhe `user.isFollowing` për përdoruesin. |
| **Super avancuar** | **Fetch si Instagram:** AbortController për anulim në unmount/retry/refresh; timeout 20s. **URL sync:** `/reels?i=N` – indeksi në URL, back/forward mbështetet. **Mute persistence:** sessionStorage (`reels_muted`) – preferenca mbetet. **Native Share API:** në mobil për ndarje; fallback kopjo link. **Kohë relative:** "5m", "2 orë", "3 ditë" sipër caption. **Ndiq/Ndiqet** në reel (optimistic) nga `user.isFollowing`. **Prefetch video:** video fshehur për reel-in pasardhës (preload). **Shiko të gjitha X komente** link te postimi. **Haptic:** `navigator.vibrate(10)` në double-tap like. **Document title:** "@username • Reels • AlbNet". |

---

## 4. Profil

| Veçori | Si funksionon |
|--------|----------------|
| **Redaktim** | `/profili/redakto`: avatar, emër, bio, website, lokacion, profili privat. Ruajtja përditëson store dhe ridrejton te profili. |
| **Skedat** | Postime, Ruajturat, Tagged, Arkivuara (vetëm për profilin tënd). |
| **Story ring** | Në profilin e të tjerëve: nëse kanë story aktive, avatar me unazë gradient dhe link te story viewer. |
| **Veprime** | Mesazh (→ `/mesazhe/te-rinj?username=...`), Ndiq / Çndiq. |

---

## 5. Postime (CRUD)

| Veçori | Si funksionon |
|--------|----------------|
| **Feed / kartë** | Meny "Më shumë": Shko te postimi, Kopjo linkun, Shiko profilin, Raporto; modal Ndaj. |
| **Faqja e postit** | Redakto (caption, hashtags), Arkivo, Fshi (me konfirmim). Komente: Fshi (pronari), Ndrysho (vetëm autori). |
| **Video/reel në feed** | `<video>` me `controls`, `playsInline`, `preload="metadata"`. |

---

## 6. Njoftime

| Veçori | Si funksionon |
|--------|----------------|
| **Badge** | Numri i të palexuarave mbi ikonën e zemrës (header mobil + sidebar desktop). Fetch: `GET /api/notifications?limit=1` → `unreadCount`. |
| **Faqja** | Listë njoftimesh, filtër Të gjitha / Të palexuara, Shëno si të lexuar (një ose të gjitha). |

---

## 7. Kërkim / Eksploro

| Veçori | Si funksionon |
|--------|----------------|
| **Kërko** | Historik kërkimesh (localStorage), sugjerime nga API kur fusha bosh. |
| **Eksploro** | Postime të sugjeruara + hashtag trend. Tab Postime / Hashtag. Gabim në ngarkim: mesazh + **Provo përsëri**. Varësia nga `user` për fetch. |

---

## 8. Chat global dhe mesazhe

| Veçori | Si funksionon |
|--------|----------------|
| **Chat global** | Mesazhe në kohë reale (Socket), fallback REST. Load more, ndarje sipas datës, moderim (fshi/ndalo). |
| **Mesazhe** | Bisedë e re me `?username=...`; Socket.io për mesazhe dhe typing. |

---

## 9. Backend – përmbledhje API

- **Feed:** `GET /api/posts/feed?limit=12&cursor=...` → `{ posts, hasMore, nextCursor }`
- **Reels:** `GET /api/posts/reels?limit=12&cursor=...` → `{ reels, hasMore, nextCursor }`
- **Story:** `GET /api/stories` (grupe), `POST /api/stories/:id/shiko`
- **Njoftime:** `GET /api/notifications?limit=1` → përfshirë `unreadCount`
- **Profil:** `GET /api/users/:username`; redaktim me avatar, bio, etj.

---

## 10. Skedarë kryesorë

| Zona | Skedarë |
|------|--------|
| Feed | `frontend/app/(app)/feed/page.tsx`, `feed/PostCard.tsx` |
| Story | `frontend/components/StoryRing.tsx`, `frontend/app/(app)/story/[userId]/page.tsx` |
| Reels | `frontend/app/(app)/reels/page.tsx` |
| Profil | `frontend/app/(app)/profili/[username]/page.tsx`, `profili/redakto/page.tsx` |
| Layout / nav | `frontend/app/(app)/layout.tsx` |
| Backend feed/reels | `backend/controllers/postController.js` (getFeed, getReels me cursor) |
| Toast / Error / API | `frontend/store/useToastStore.ts`, `components/Toaster.tsx`, `components/ErrorBoundary.tsx`, `utils/api.ts` |
| Skeleton | `frontend/components/Skeleton.tsx` (SkeletonPostBlock, SkeletonStoryRing) |

---

## 11. Përmirësime të avancuara (version më i avancuar)

| Veçori | Përshkrim |
|--------|-----------|
| **Toast global** | Store `useToastStore`: `success()`, `error()`, `info()`. Komponenti `Toaster` në layout. Mesazhe: "Ruajtuar", "Linku u kopjua", "U hoq nga ruajturat", gabime. |
| **Optimistic updates** | **Like** (feed, reels): UI ndryshon menjëherë; në gabim rollback + toast. **Ruajtje** (save): njësoj. **Ndiq/Çndiq** (profil): ndryshim menjëherë, rollback në gabim. |
| **Error boundary** | `ErrorBoundary` rreth `children` në layout: kap gabime në render, shfaq fallback me "Provo përsëri" dhe link te kryefaqja. |
| **API me timeout** | `api(path, { timeout?: number, signal?: AbortSignal })`. Default 30s; anulim me `AbortController`; mesazh i qartë për timeout/abort. |
| **Health check** | `GET /api/health`: kthen `status`, `db` (connected/disconnected), `timestamp`. 503 nëse DB nuk është e lidhur (për load balancer / monitoring). |
| **Skeleton** | Komponentët `Skeleton`, `SkeletonCircle`, `SkeletonPostBlock`, `SkeletonStoryRing` për loading state të njëtrajtshëm. |

---

## 12. Web i plotë – të gjitha faqet e avancuara (si Instagram)

| Faqe | Përmirësimet |
|------|--------------|
| **Feed** | AbortController për load dhe refresh. Skeleton për story ring. Document title Kryefaja/Ndiqet. |
| **Explore** | Pull-to-refresh, load more me page, skeleton grid, title Eksploro, Provo përsëri. |
| **Profil** | Document title @username. |
| **Story** | Swipe down për të mbyllur (si Instagram). |
| **Njoftime** | Document title, gabim + Provo përsëri. |
| **Post / Kërko** | Document title. |
| **Layout** | aria-current="page" në nav. |
| **Hook** | useDocumentTitle – titull faqe + cleanup. |

Ky është **versioni final i avancuar** i AlbNet: logjikë si Instagram, faqe me fetch të kontrolluar, document title, skeleton/retry, story swipe-to-close, nav aksesibel.
