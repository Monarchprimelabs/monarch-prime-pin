# Monarch Prime Pin

Premium peptide injection tracker for research use. iOS + Android via React Native + Expo.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Expo
npx expo start
```

Then on your phone:
- **iOS**: Open the Camera app, point it at the QR code in the terminal, tap the link to open in Expo Go
- **Android**: Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent), open it, scan the QR code

The app will load on your device. Hot reload works — save any file and the app refreshes automatically.

## Developer Bypass

To skip the sign-in screen during development or App Review:

1. On the Sign In screen, tap the **Monarch Prime logo 5 times** within 3 seconds
2. A passcode pad appears
3. Enter `0420`

This unlocks Developer Mode. Data stays local and isolated from real user data.

To change the passcode, edit `src/theme/index.ts`:
```ts
export const DEV_PASSCODE = '0420';
```

## How the App Currently Works (Offline Mode)

By default, the app runs entirely **offline**:
- Sign In, Sign Up, and Continue as Guest all work locally
- All injection logs save to device storage (AsyncStorage)
- Photos save as local file URIs
- AI Coach works (knowledge base, not live LLM)
- Calculator and analytics work with your real data
- Nothing leaves the device

This means **SAVE INJECTION works immediately**, no backend setup required. Your test data persists across app launches.

## Connecting Supabase (When You're Ready)

When you want real cloud sync, real auth, and real photo storage:

### 1. Create a Supabase project
Go to [app.supabase.com](https://app.supabase.com) → New Project. Free tier is fine.

### 2. Set up the database
In the Supabase SQL Editor, run:

```sql
-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  created_at timestamp with time zone default now()
);

-- Injections table
create table injections (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  peptide text not null,
  dose text not null,
  unit text not null,
  date text not null,
  time text not null,
  site text not null,
  sev text not null,
  weight numeric default 0,
  notes text,
  photo_uri text,
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table injections enable row level security;

create policy "Users see own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users see own injections" on injections
  for select using (auth.uid() = user_id);
create policy "Users insert own injections" on injections
  for insert with check (auth.uid() = user_id);
create policy "Users update own injections" on injections
  for update using (auth.uid() = user_id);
create policy "Users delete own injections" on injections
  for delete using (auth.uid() = user_id);

-- Storage bucket for progress photos
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', true);

create policy "Users can upload own photos" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Photos are publicly readable" on storage.objects
  for select using (bucket_id = 'progress-photos');
```

### 3. Add credentials to the app
Edit `src/lib/supabase.ts`:

```ts
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Get these from Supabase: Project Settings → API.

### 4. Restart the app
That's it. New users will sync to your Supabase project automatically. Guest and Developer modes always stay local.

## Project Structure

```
MonarchPrimePin/
├── App.tsx                 # Root entry point
├── app.json                # Expo config (icons, permissions, bundle ID)
├── package.json            # Dependencies
├── babel.config.js         # Babel + Reanimated plugin
├── tsconfig.json           # TypeScript config
├── assets/                 # App icons, splash, logos
│   ├── icon.png            # 1024×1024 iOS app icon
│   ├── adaptive-icon.png   # Android adaptive icon foreground
│   ├── splash.png          # Launch screen
│   ├── logo-symbol.png     # Symbol for in-app headers
│   └── logo-full.png       # Full logo for sign-in screen
└── src/
    ├── theme/              # Colors, spacing, typography tokens
    ├── data/
    │   ├── peptides.ts     # Peptide list, zones, types, seed data
    │   └── aiKnowledge.ts  # AI Coach knowledge base (educational)
    ├── lib/
    │   ├── supabase.ts     # Supabase client (offline-first fallback)
    │   ├── storage.ts      # CRUD for injections, photo upload
    │   └── auth.tsx        # Auth context (email/guest/developer)
    ├── components/
    │   ├── UI.tsx          # Header, Card, ViewPill, Disclaimer, etc.
    │   ├── Mannequin.tsx   # Blob mannequin SVG (front + back)
    │   └── BodyDiagram.tsx # Mannequin + tappable injection zones
    ├── screens/
    │   ├── SignInScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── LogInjectionScreen.tsx
    │   ├── HistoryScreen.tsx
    │   ├── AICoachScreen.tsx
    │   ├── AnalyticsScreen.tsx
    │   └── SettingsScreen.tsx
    └── navigation/
        ├── RootNavigator.tsx  # Auth gate
        └── BottomTabs.tsx     # Six-tab bar
```

## Building for the App Store

When you're ready to submit:

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Replace the placeholder project ID
In `app.json`, replace `REPLACE_WITH_EAS_PROJECT_ID` with your actual EAS project ID (auto-set by `eas build:configure`).

### Build
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### Submit
```bash
# iOS to TestFlight / App Store Connect
eas submit --platform ios

# Android to Play Console
eas submit --platform android
```

## App Store Listing — Pricing

This app is configured to launch as a **paid app at $4.99**. Set this in:
- **App Store Connect**: Pricing and Availability → Tier 5 ($4.99)
- **Google Play Console**: Monetization setup → Paid app, $4.99

## Troubleshooting

**App won't load in Expo Go**
- Make sure your phone and computer are on the same Wi-Fi
- Try `npx expo start --tunnel` if Wi-Fi is blocked

**Photo permission denied**
- iOS: Settings → Monarch Prime Pin → Photos → All Photos
- Android: Settings → Apps → Monarch Prime Pin → Permissions → Photos and Videos

**SAVE INJECTION button shows error**
- This means a required field is missing (peptide, dose, or site). The button validates first.

**Want to clear all test data?**
- Sign Out from Settings → Reminders, OR
- Delete and reinstall the app

## License

Proprietary — Monarch Prime Labs. All rights reserved.

## For Research Use Only

This application is intended SOLELY for research data logging. The compounds referenced are NOT approved for human consumption by any regulatory authority. See the Legal tab in Settings for full disclaimer.
