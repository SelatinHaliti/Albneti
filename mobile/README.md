# AlbNet Mobile – iOS & Android

Aplikacion native Expo që ngarkon AlbNet web (WebView) me branding shqiptar.

## Shpejt

```bash
cd mobile
npm install
npm start          # Expo dev
npm run android    # Android emulator
npm run ios        # iOS simulator (Mac)
```

## Ndërto APK/IPA (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production   # APK
eas build --platform ios --profile production     # IPA (kërkon Apple Developer)
```

## Veçori

- Splash screen me branding AlbNet (#e41e26)
- Dark mode automatik
- Pull-to-refresh, cookies, back button Android
- Kamera/galeri permissions për postime
- Deep link: `albnet://`

## URL

Default: `https://albneti.vercel.app` (ndrysho në `App.js` për dev lokal)
