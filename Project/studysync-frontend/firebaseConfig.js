// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3zgj_rKAsDXJyxhj4l8swpu39EmoCEh8",
  authDomain: "studysession-app.firebaseapp.com",
  projectId: "studysession-app",
  storageBucket: "studysession-app.firebasestorage.app",
  messagingSenderId: "162733594689",
  appId: "1:162733594689:web:a9fc67ac50947c8d20cec0",
  measurementId: "G-647BQYDHNT"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

