import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1FFFURa_DCxAs-X5k8ZyKU7FXqnOwt80",
  authDomain: "contemagiqueia.firebaseapp.com",
  projectId: "contemagiqueia",
  storageBucket: "contemagiqueia.firebasestorage.app",
  messagingSenderId: "257098184858",
  appId: "1:257098184858:web:0a2f95a9086b922bcc0723",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);