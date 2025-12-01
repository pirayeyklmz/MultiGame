// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔹 Burayı kendi Firebase konsolundaki değerlerle doldur
const firebaseConfig = {
  apiKey: "SENİN_API_KEY",
  authDomain: "SENİN_PROJE.firebaseapp.com",
  projectId: "SENİN_PROJE",
  storageBucket: "SENİN_PROJE.appspot.com",
  messagingSenderId: "SENİN_MESSAGING_ID",
  appId: "SENİN_APP_ID"
};

// Firebase başlat
const app = initializeApp(firebaseConfig);

// Firestore veritabanını dışa aktar
export const db = getFirestore(app);
