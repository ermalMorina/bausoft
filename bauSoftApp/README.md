# bauSoft React Native App

A React Native application built with Expo and TypeScript.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (installed globally or via npx)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

This will open the Expo DevTools. You can then:
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code with Expo Go app on your phone

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start on Android emulator
- `npm run ios` - Start on iOS simulator
- `npm run web` - Start web version

## Project Structure

```
bauSoftApp/
├── App.tsx          # Main app component
├── app.json         # Expo configuration
├── package.json     # Dependencies
├── tsconfig.json    # TypeScript configuration
└── assets/          # Images and other assets
```

## Development

The app is set up with:
- TypeScript for type safety
- Expo for easy development and deployment
- React Navigation (ready to use)

## Building for Production

When ready to build:

```bash
# For iOS
expo build:ios

# For Android
expo build:android
```
