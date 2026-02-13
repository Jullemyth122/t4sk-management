// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai"; // Add this import
import { FacebookAuthProvider, getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYp4X7iPXe-x6ExPDsMiLQDnxa11w3irc",
  authDomain: "t4sk-management.firebaseapp.com",
  projectId: "t4sk-management",
  storageBucket: "t4sk-management.firebasestorage.app",
  messagingSenderId: "793539323795",
  appId: "1:793539323795:web:8b258fd229186014c76a66",
  measurementId: "G-687TPFB54B",
  databaseURL: "https://t4sk-management-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const dbRealtime = getDatabase(app);

// Initialize AI (Gemini backend)
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" }); // Export this for OCR use

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { app, auth, db, dbRealtime, model, googleProvider, facebookProvider }; // Add 'model' to exports