// app/auth/login.tsx
import React, { useEffect } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { useRouter } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();

  // 1️⃣ Google Auth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    // @ts-ignore  // 👈 ignore TS complaining about expoClientId
    expoClientId: "162733594689-tjbshrviamjka3m7qu77o3od1lne1alr.apps.googleusercontent.com",
    iosClientId: "162733594689-tjbshrviamjka3m7qu77o3od1lne1alr.apps.googleusercontent.com",
    androidClientId: "162733594689-tjbshrviamjka3m7qu77o3od1lne1alr.apps.googleusercontent.com",
    redirectUri: "https://auth.expo.io/@aryanp1/studysync-frontend",
  });


  //Testing to see what the redirect URI is cuz ts trippin rn
  useEffect(() => {
    if (request) {
      console.log("🔗 Redirect URI:", request.redirectUri);
    }
  }, [request]);

  // 2️⃣ Firebase sign-in when Google login succeeds
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      signInWithCredential(auth, credential)
        .then((result) => {
          console.log("✅ Firebase sign-in success:", result.user.email);
        })
        .catch((error) => {
          console.error("❌ Firebase sign-in error:", error);
        });
    }
  }, [response]);

  // 3️⃣ Redirect logged-in users to home
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("👤 User logged in:", user.email);
        router.replace("/"); // 👈 goes to your main screen (index.tsx)
      }
    });
    return unsubscribe;
  }, []);

  // 4️⃣ UI
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Welcome to StudySync!</Text>

      {!request ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Sign in with Google" onPress={() => promptAsync()} />
      )}
    </View>
  );
}
