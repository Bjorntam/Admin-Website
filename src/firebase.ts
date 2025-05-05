// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFUvRc2DVYGjCA4RNPpiDf1ArAICUdyzg",
    authDomain: "metamorpet-d91aa.firebaseapp.com",
    databaseURL: "https://metamorpet-d91aa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "metamorpet-d91aa",
    storageBucket: "metamorpet-d91aa.firebasestorage.app",
    messagingSenderId: "853471625963",
    appId: "1:853471625963:web:4da0030c031f013d9174ae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;