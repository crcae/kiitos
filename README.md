# Kiitos - Bill Splitting App

A modern, Airbnb-style bill splitting application built with Expo, React Native, TypeScript, NativeWind, and Firebase.

## Features

- **Authentication**: Login and Sign Up with Email/Password (Google Auth ready).
- **Bill Scanning**: Mocked bill scanning flow.
- **Bill Details**: View items, subtotal, tax, and total.
- **Splitting Options**:
  - Pay Full Bill
  - Split Equally (2-10 people)
  - Select Items (UI ready, logic pending)
- **Tipping**: Preset percentages (10%, 15%, 20%) or custom amount.
- **Checkout**: Stripe payment integration (mocked).

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Firebase and Stripe keys.
   ```bash
   cp .env.example .env
   ```

## Running the App

### Web
To run the app in your browser:
```bash
npm run web
```
Open [http://localhost:8081](http://localhost:8081) to view it.

### Android
To run on an Android Emulator or device:
1. Install Android Studio and set up an emulator.
2. Run:
   ```bash
   npm run android
   ```
   Or press `a` in the terminal after starting Expo.

### iOS (Mac only)
To run on an iOS Simulator:
1. Install Xcode from the App Store.
2. Run:
   ```bash
   npm run ios
   ```
   Or press `i` in the terminal after starting Expo.

### Troubleshooting
- **Web Bundling Errors**: If you see errors about "NativeWind" or "CSS", try clearing the cache:
  ```bash
  npx expo start -c --web
  ```
- **Port Conflicts**: If port 8081 is busy, Expo will prompt to use another port (e.g., 8082, 8083). Check the terminal output for the correct URL.

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication (Email/Password, Google).
3. Enable Firestore.
4. Create a `profiles` collection (optional, app creates it on signup).
5. Deploy Cloud Functions (for Stripe):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Payments**: Stripe
