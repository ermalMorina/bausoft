# bauSoft React Native App

A React Native application built with Expo and TypeScript. It contains two features:
Invoicing and **Construction Workforce & Site Management** (behind the "👷 Workforce &
Site Management" button on the home screen). Both talk to the GraphQL backend in
`bauSoftBackend`.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (workspaces; no extra package manager needed)
- Expo CLI (via `npx`, no global install required)
- **For iOS:** a Mac with **Xcode** + Command Line Tools (`xcode-select --install`) and **CocoaPods** (`sudo gem install cocoapods`)

### Installation

Run from the **monorepo root** so both workspaces are installed together:

```bash
npm install
```

### Start the backend first (the app needs the GraphQL API)

```bash
npm run prisma:generate
npm run dev:backend            # http://localhost:4000/graphql
```

Seed some data so the screens aren't empty:

```bash
npm run create-user            # a default invoicing user
npm run seed:workforce         # a demo 3-site / 3-team / 23-employee company
```

Configure the API URL for the app by creating `bauSoftApp/.env` (see `.env.example`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql   # iOS Simulator & web
# Android emulator: http://10.0.2.2:4000/graphql
# Physical device:  http://<your-LAN-IP>:4000/graphql
```

## Running on iOS

iOS requires macOS + Xcode. Run these on your Mac after `npm install` and with the
backend running.

### Option A — native / development build (recommended)

This repo uses `expo-dev-client` and keeps an `ios/` project, so the standard flow is a
native build:

```bash
# from the monorepo root
npm run ios            # = expo run:ios (builds & launches the iOS Simulator)
```

If the native project or pods are stale, regenerate them first:

```bash
npm run ios:build      # = expo prebuild --platform ios  (regenerates ios/)
npm run ios:pod        # = pod install inside ios/
npm run ios            # build & run
```

To run on a **physical iPhone**, open `bauSoftApp/ios/bauSoftApp.xcworkspace` in Xcode,
select your device, set your signing team, and press Run. See `XCODE_SETUP.md` for details.

### Option B — Expo Go (quickest)

```bash
npm run dev:app        # = expo start
# press  i  to open the iOS Simulator, or scan the QR code with the Expo Go app
```

### Available Scripts (root)

- `npm run dev:backend` — start the GraphQL backend
- `npm run dev:app` — start the Expo dev server (press `i` for iOS, `a` for Android, `w` for web)
- `npm run ios` — build & launch the iOS Simulator (native build)
- `npm run ios:build` — regenerate the native `ios/` project (`expo prebuild`)
- `npm run ios:pod` — `pod install` inside `ios/`
- `npm run build:app` — export/build the app bundle

> Tip: run `dev:backend` and `dev:app` in **separate terminals** — the monorepo's Metro
> config intentionally narrows file watching to avoid `EMFILE` limits.

## Project Structure

```
bauSoftApp/
├── index.js              # App entry (registerRootComponent)
├── App.tsx               # Root component
├── app.json              # Expo configuration
├── metro.config.js       # Monorepo-aware Metro config
├── src/
│   ├── navigation/       # React Navigation stack
│   ├── screens/          # Invoice + workforce screens
│   ├── services/         # GraphQL clients (api.ts, workforceApi.ts)
│   └── workforce/        # Shared workforce UI kit
└── assets/               # Images and other assets
```

## Development

The app is set up with:
- TypeScript for type safety
- Expo (SDK 51) with `expo-dev-client`
- React Navigation
