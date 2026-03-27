import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpHWRrp5825KNVPC-gKQ1qNOj-aztDm9s",
  authDomain: "asad-f6409.firebaseapp.com",
  projectId: "asad-f6409",
  storageBucket: "asad-f6409.firebasestorage.app",
  messagingSenderId: "834095752322",
  appId: "1:834095752322:web:75ab2b13d447083c29009b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
