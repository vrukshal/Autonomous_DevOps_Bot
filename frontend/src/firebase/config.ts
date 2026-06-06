import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDWciVKiOuFKx8vhHnyJusT3dlmquo0jrw",
  authDomain: "devopsbot-46359.firebaseapp.com",
  projectId: "devopsbot-46359",
  storageBucket: "devopsbot-46359.firebasestorage.app",
  messagingSenderId: "727458795585",
  appId: "1:727458795585:web:72522daf3eff8b0ac636c0",
  measurementId: "G-MZEF6SV1SW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
