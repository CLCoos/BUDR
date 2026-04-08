# BUDR Expo Test App

Denne Expo-app wrapper din eksisterende Next.js-app i en `WebView`, saa du kan teste paa telefon hurtigt.

## 1) Start web-appen

I projektroden:

```bash
cd "/Users/christiancloos/Desktop/budr-luksus"
npm run dev
```

## 2) Start Expo

I en ny terminal:

```bash
cd "/Users/christiancloos/Desktop/budr-luksus/expo"
npm install
npm run start
```

Scan QR-koden i Expo Go.

## URL der indlaeses

- Default: `http://localhost:4028/resident-demo`
- Android emulator bruger automatisk: `http://10.0.2.2:4028/resident-demo`
- Kan overskrives med env:

```bash
EXPO_PUBLIC_WEB_URL="https://din-url" npm run start
```

## Bemærk

Dette er en hurtig test-wrapper. Din eksisterende BUDR Care Portal-opkobling bliver i Next.js-laget, som allerede fungerer.
