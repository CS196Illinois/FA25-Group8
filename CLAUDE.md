# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StudySync (Study@UIUC) is a mobile application for coordinating study sessions among students. The project consists of:

- **Frontend**: React Native + Expo application (TypeScript/TSX)
- **Backend**: Express.js REST API with Firebase Admin SDK
- **Database**: Firebase Firestore for real-time data synchronization
- **Authentication**: Firebase Authentication with email/password

## Repository Structure

```
Project/
├── studysync-frontend/    # React Native Expo app
│   ├── app/              # Expo Router file-based routing
│   │   ├── (tabs)/       # Tab navigation screens
│   │   ├── contexts/     # React contexts (AuthContext)
│   │   ├── _layout.tsx   # Root layout with auth routing
│   │   ├── login.tsx     # Login/signup screen
│   │   └── studysessions.tsx  # Main sessions list
│   ├── components/       # Reusable UI components
│   ├── firebaseConfig.js # Firebase client initialization
│   └── notificationService.js  # Expo notifications logic
└── studysync-backend/    # Node.js Express server
    ├── index.js          # Main server file with /sessions endpoint
    └── scripts/
        └── seed-sessions.js  # Firestore seeding script
```

## Development Commands

### Frontend (React Native + Expo)

Navigate to `Project/studysync-frontend/` first:

```bash
# Install dependencies
npm install

# Start development server (opens Metro bundler)
npx expo start

# Platform-specific launches
npx expo start --ios
npx expo start --android
npx expo start --web

# Linting
npm run lint
```

### Backend (Express + Firebase Admin)

Navigate to `Project/studysync-backend/` first:

```bash
# Install dependencies
npm install

# Start server (requires serviceAccountKey.json)
npm start
# or
node index.js

# Seed Firestore with sample sessions
node scripts/seed-sessions.js
```

## Architecture & Key Patterns

### Authentication Flow

The app uses a protected routing pattern managed in `app/_layout.tsx`:

1. **AuthProvider** wraps the entire app, exposing `user`, `loading`, `signUp`, `signIn`, `logOut`
2. **RootLayoutNav** uses `useAuth()` and `useSegments()` to redirect:
   - Not authenticated → redirect to `/login`
   - Authenticated but on `/login` → redirect to `/(tabs)/studysessions`
3. Auth state persists automatically via Firebase `onAuthStateChanged`

### Firebase Integration

**Client-side** (`firebaseConfig.js`):
- Initializes Firebase app, Auth, and Firestore
- Web-only: Conditionally imports Firebase Analytics with `Platform.OS === "web"`
- Exports: `FIREBASE_APP`, `FIREBASE_AUTH`, `FIRESTORE_DB`

**Server-side** (`index.js`):
- Uses `firebase-admin` SDK with service account key
- Reads from `serviceAccountKey.json` (not committed to repo)
- Provides REST endpoints for potential server-side operations

### Data Model: StudySession

Firestore collection: `sessions`

```typescript
interface StudySession {
  id: string;
  creatorId: string;
  creatorName: string;
  course: string;           // e.g., "CS 173"
  topic: string;            // e.g., "Induction Practice"
  locationName: string;     // e.g., "Siebel 1404"
  locationDetails?: string; // Optional extra info
  locationCoords: { latitude: number; longitude: number };
  startTime: Date;          // Firestore Timestamp → Date
  endTime?: Date | null;    // Optional end time
  signupPolicy: 'required' | 'preferred' | 'open';
  capacity?: number;        // Max attendees (optional)
  attendees: string[];      // Array of user IDs
  isFull: boolean;
  createdAt: Date;
}
```

**Important**: Firestore returns `Timestamp` objects; convert with `.toDate()` before using.

### Real-time Data Synchronization

`studysessions.tsx` uses Firestore's `onSnapshot()` for live updates:

```typescript
const q = query(collection(db, "sessions"));
const unsubscribe = onSnapshot(q, (snapshot) => {
  // Update local state with real-time changes
});
```

Always return the unsubscribe function in `useEffect` cleanup to prevent memory leaks.

### Notifications

`notificationService.js` provides:
- `getNotificationPermission()`: Request permission once (tracks with AsyncStorage)
- `scheduleSessionReminder(startTime, sessionId)`: Schedule 30-min-before reminder
- `cancelSessionReminderBySessionId(sessionId)`: Cancel by session ID
- Maintains mapping between sessionId and notificationId in AsyncStorage

Call `getNotificationPermission()` once on app start or after login.

### Routing & Navigation

Uses **Expo Router** (file-based routing):
- `app/_layout.tsx`: Root stack navigator
- `app/(tabs)/_layout.tsx`: Tab navigation layout
- `app/login.tsx`: Auth screen
- `app/studysessions.tsx`: Main content (also aliased in `(tabs)/`)

Stack Screen configuration:
- `/login` → `headerShown: false`
- `/(tabs)` → Tab navigator with `headerShown: false`

### Styling Approach

All styles use `StyleSheet.create()` with inline definitions. No external styling library.

Color palette:
- Primary blue: `#3B82F6`
- Success green: `#10B981`
- Warning orange: `#F59E0B`
- Error red: `#EF4444`
- Gray scale: `#F9FAFB`, `#E5E7EB`, `#9CA3AF`, `#6B7280`, `#4B5563`, `#1F2937`

## Firebase Configuration

Both frontend and backend require Firebase credentials:

**Frontend**: `firebaseConfig.js` contains public Firebase config (API key, project ID, etc.)

**Backend**: `serviceAccountKey.json` (gitignored) contains private service account credentials. This file must be obtained from Firebase Console → Project Settings → Service Accounts.

## Testing & Seeding Data

To populate Firestore with sample sessions:

```bash
cd Project/studysync-backend
node scripts/seed-sessions.js
```

This creates 3 sample sessions with different signup policies (required, preferred, open).

## Important Notes

- **Firebase Rules**: Firestore security rules are configured server-side. If reads/writes fail, check Firebase Console → Firestore → Rules.
- **Service Account Key**: Never commit `serviceAccountKey.json` to version control.
- **Platform Differences**: Analytics and some features are web-only; guard with `Platform.OS === "web"`.
- **TypeScript**: Frontend uses TypeScript with strict type checking (`tsconfig.json`).
- **Expo Router**: Uses experimental features: `typedRoutes: true`, `reactCompiler: true`.

## About Me
This project is being developed by a group of beginner Computer Science students who are learning mobile development through creating this project. As such, we will need help from time to time. When we ask you for help, any code you write make sure to comment how it worked in such a way that we can understand. Additionally, try to help us learn concepts so that we understand the code we are writing.