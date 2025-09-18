import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6FKMNQ_rPfquTGlX6my6Uzl1f8DX-NAE",
  authDomain: "zenithstudio-97468.firebaseapp.com",
  projectId: "zenithstudio-97468",
  storageBucket: "zenithstudio-97468.firebasestorage.app",
  messagingSenderId: "179316789546",
  appId: "1:179316789546:web:2bf32cdfd1b2dce4fe8e53",
  measurementId: "G-LJJV69FS3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
