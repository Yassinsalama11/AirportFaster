# AirportFaster Mobile App

React Native app built with Expo.

## Setup

```bash
pnpm install
cd apps/mobile
cp .env.example .env.local
# Edit EXPO_PUBLIC_API_URL to point to your API
npx expo start
```

## Development

- iOS Simulator: Press `i` in Expo dev server
- Android Emulator: Press `a`
- Physical device: Scan QR code with Expo Go app

## Build

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build
eas build --platform ios
eas build --platform android
```

## Architecture

- **Expo Router** for file-based navigation
- **API**: Shared AirportFaster Fastify backend at EXPO_PUBLIC_API_URL
- **Auth**: Expo SecureStore for managing customer session tokens
- **Payments**: Stripe React Native SDK (to be wired in next sprint)
