# Copilot instructions for FA25-Group8 (StudySync)

These notes make AI coding agents productive fast in this repo. Keep edits small, runnable, and verified. Prefer concrete patterns shown below over generic advice.

## Big picture
- Monorepo with two apps under `Project/`:
  - `studysync-frontend`: Expo + React Native (expo-router) client using Firebase Auth and Firestore.
  - `studysync-backend`: Minimal Express server primarily for health checks and local development helpers; includes a Firestore seed script via firebase-admin.
- Source of truth for session data is Firestore. Frontend reads `sessions` collection live; backend `scripts/seed-sessions.js` can populate sample docs.
- Authentication is Firebase Email/Password; app gates routes based on auth state.

## Key workflows (do these exactly)
- Backend (requires a private key not in git):
  - Place `serviceAccountKey.json` in `Project/studysync-backend/` (do not commit).
  - Install and run: `npm install`; `npm start` from `Project/studysync-backend`. Health endpoint: `GET /health`.
  - Seed Firestore (optional): `node scripts/seed-sessions.js` (uses firebase-admin and the service account).
- Frontend:
  - From `Project/studysync-frontend`: `npm install`; `npm start` to launch Expo.
  - Login screen at `app/login.tsx` uses the `AuthContext`; successful auth redirects to `/(tabs)/studysessions`.
  - File-based routing via `expo-router` under `app/`. The tab route re-exports the screen from `app/studysessions.tsx`.

## Current Features (November 2025)
- ✅ **Authentication**: Firebase email/password with route guards
- ✅ **Session List**: Real-time Firestore sync with live updates
- ✅ **Join/Leave Sessions**: Firestore transactions with capacity validation
- ✅ **Session Creation**: Modal with Google Places autocomplete and date/time picker
- ✅ **Google Calendar Integration**: Generate calendar event URLs for sessions
- ✅ **Google Maps Integration**: Platform-specific deep links to session locations
- ✅ **Notifications**: Expo notifications with AsyncStorage persistence
- 🚧 **Search/Filter**: In development (see `search-filter-feature` branch)

## Architectural conventions and patterns
- Routing and auth guard:
  - `app/_layout.tsx` wraps the app with `AuthProvider` and redirects unauthenticated users to `/login` using `useSegments()` + `useRouter()`.
- Firebase client setup:
  - `firebaseConfig.js` exports `FIREBASE_APP`, `FIREBASE_AUTH`, `FIRESTORE_DB`. Analytics init is web-only and lazy to avoid SSR/window access.
- Firestore data access:
  - In `app/studysessions.tsx`, sessions stream is established with `onSnapshot(query(collection(db, "sessions")))`.
  - Timestamps from Firestore are normalized defensively:
    ```ts
    const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date();
    const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : null;
    ```
  - Keep this guard pattern when adding new Firestore-backed screens.
- Session model (Firestore-backed): The UI expects fields like `creatorName`, `course`, `topic`, `locationName`, `locationCoords`, `startTime`, optional `endTime`, `signupPolicy`, optional `capacity`, `attendees`, `isFull`. See the `StudySession` interface in `app/studysessions.tsx` for the complete type definition.
- UI composition:
  - The main list lives in `app/studysessions.tsx` with small presentational components (`DetailRow`, `MapExcerpt`, `SessionCard`). Follow this style: compute display strings first, then render.
  - Mapping: we link out to Google Maps using `Linking` with platform-specific schemes and a web fallback.
- Calendar integration:
  - The screen builds a Google Calendar TEMPLATE URL so users review before saving. Reuse `buildGoogleCalUrl()` and `toGCalDate()` in `app/studysessions.tsx` for any future “add to calendar” actions.
- Notifications:
  - `notificationService.js` centralizes Expo Notifications flows. It persists a sessionId→notificationId map in AsyncStorage so reminders can be canceled by session. Use `getNotificationPermission()` once, then `scheduleSessionReminder()`; cancel via `cancelSessionReminderBySessionId()`.

## Coding conventions specific to this repo
- TypeScript in screens/contexts; plain JS for utilities and config. Prefer TS in new screens; keep interop by exporting JS helpers with clear JSDoc when TS isn’t needed.
- Keep Firebase reads resilient to missing fields and Timestamp types (see pattern above). Never assume non-null `endTime`.
- Use `expo-router` paths. For shared screens under tabs, re-export from `app/(tabs)/*.tsx` to keep a single implementation.
- Do not check in secrets. `serviceAccountKey.json` must live only in `Project/studysync-backend/` locally.

## External integrations and boundaries
- Frontend talks directly to Firebase (Auth/Firestore). The Express backend is not a required runtime for the app today; treat it as a utility service and future API host.
- If adding backend endpoints, mirror types used by the frontend (see the Session interface in `app/studysessions.tsx`) and prefer JSON with ISO date strings. Frontend already converts Firestore Timestamps→Date.

## Course context and AI usage policy
- This project is developed as part of CS 124 Honors. See `Docs/CS 124 Honors Syllabus Fall 2025.md` for expectations (weekly progress, presentations, event attendance) that influence how we scope features and demos.
- AI policy (see `Docs/CS 124 Honors AI Policy.md`):
  - You MUST cite AI-generated code and you MUST understand it before committing.
  - Prefer small, reviewable insertions over large, opaque dumps. Treat AI as a teammate, not a replacement for your thinking.
  - **CRITICAL: Comments must be detailed enough for 2-3 minute walkthroughs.** Team members need to explain their implementations in 7-10 minute presentations. Comments should be:
    * **Educational**: Explain WHY, not just what (e.g., "Convert to minutes for easy comparison" not just "convert time")
    * **Step-by-step**: Break down complex logic (e.g., "FILTER 1:", "FILTER 2:", etc.)
    * **Concise but complete**: Detailed enough to teach from, brief enough to read quickly
    * **Example-driven**: Include sample values (e.g., "e.g., 'CS 124', 'MATH 231'")
  - Recommended comment header (copy/paste and edit):
    ```
    /* AI-ASSISTED
       Source/Tool: GitHub Copilot (Chat) / Claude
       Author/Reviewer: <your name>  
       Date: YYYY-MM-DD  
       Why AI: <short reason>
       
       TEACHING NOTES for 2-3 minute walkthrough:
       <step-by-step explanation that you can read from during presentation>
       
       Notes: I validated behavior by <manual test/console output/screenshot>. */
    ```
  - Example usage exists in `app/studysessions.tsx` as "AI-COPILOT SNIPPET" and "AI-ASSISTED" blocks—follow that style for clarity and auditability. See the search/filter implementation for excellent examples of educational commenting.

## Examples to copy
- Firestore live list + mapping: `app/studysessions.tsx` (query, snapshot, type guards, rendering).
- Auth flow and route guarding: `app/contexts/AuthContext.tsx` and `app/_layout.tsx`.
- Seed data shape: `Project/studysync-backend/scripts/seed-sessions.js`.

## Gotchas
- Windows devs: if scripts won't run, run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell as admin.
- Expo Notifications require device/emulator support; calls are no-ops on unsupported platforms.
- Web analytics is guarded; don't import `firebase/analytics` at top-level.
- Google Places API requires billing enabled on Firebase project; manual location entry fallback exists with (0,0) coords.
