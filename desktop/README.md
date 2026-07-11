# AlbNet Desktop – Mac & Windows

Aplikacion desktop për AlbNet (Electron wrapper).

## Kërkesat

- Node.js 18+
- npm

## Përdorim lokal

```bash
cd desktop
npm install
npm start
```

## Ndërto instalues

```bash
# Windows (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Të dyja
npm run build:all
```

Output: `desktop/dist/`

## Konfigurim

- URL default: `https://albneti.vercel.app`
- Override: `set ALBNET_URL=http://localhost:3000` (Windows) ose `ALBNET_URL=... npm start` (Mac/Linux)

## Ikona

Vendos `icon.png`, `icon.ico`, `icon.icns` në `desktop/assets/`.
Për build production, krijo ikonat nga logo AlbNet (512x512 PNG).
