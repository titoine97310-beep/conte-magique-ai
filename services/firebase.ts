import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1FFFURa_DCxAs-X5k8ZyKU7FXqnOwt80",
  authDomain: "contemagiqueia.firebaseapp.com",
  projectId: "contemagiqueia",
  storageBucket: "contemagiqueia.firebasestorage.app",
  messagingSenderId: "257098184858",
  appId: "1:257098184858:web:0a2f95a9086b922bcc07a3",
};

export const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const db = getFirestore(app);