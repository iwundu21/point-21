
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKSKvPjSbb4pQU5nTJm19SlswElgLcxuM",
  authDomain: "exnus-points-eccnf.firebaseapp.com",
  projectId: "exnus-points-eccnf",
  storageBucket: "exnus-points-eccnf.appspot.com",
  messagingSenderId: "981614065888",
  appId: "1:981614065888:web:3f5a73f90ad4169172b885"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db, app };
