import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDXG-4LlaIeu3E5Gx6nUEuBNhhBwZ4cpiE",
  authDomain: "saska-bussiness-proposal-gen.firebaseapp.com",
  projectId: "saska-bussiness-proposal-gen",
  storageBucket: "saska-bussiness-proposal-gen.firebasestorage.app",
  messagingSenderId: "670990456120",
  appId: "1:670990456120:web:fc2b887ac2fe39c8d85dcd",
  measurementId: "G-62KRTRBBNQ",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const analytics = getAnalytics(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
