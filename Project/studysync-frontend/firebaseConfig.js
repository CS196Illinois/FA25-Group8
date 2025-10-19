import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyA3zgj_rKAsDXJyxhj4l8swpu39EmoCEh8",
  authDomain: "studysession-app.firebaseapp.com",
  projectId: "studysession-app",
  storageBucket: "studysession-app.firebasestorage.app",
  messagingSenderId: "162733594689",
  appId: "1:162733594689:web:a9fc67ac50947c8d20cec0",
  measurementId: "G-647BQYDHNT",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Web-only Analytics: do not import firebase/analytics at the top level.
// Guard against SSR so no window access happens on the server.
export let analytics = null;
if (Platform.OS === "web" && typeof window !== "undefined") {
  (async () => {
    try {
      const { getAnalytics, isSupported } = await import("firebase/analytics");
      if (await isSupported()) {
        analytics = getAnalytics(app);
      }
    } catch {
      // ignore analytics init errors on web
    }
  })();
}