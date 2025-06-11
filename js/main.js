// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfsAqNVdA2YJGGiHYGOk_lKTgc9fO--aM",
  authDomain: "projeto-ifsp-3-semestre.firebaseapp.com",
  projectId: "projeto-ifsp-3-semestre",
  storageBucket: "projeto-ifsp-3-semestre.firebasestorage.app",
  messagingSenderId: "723939427008",
  appId: "1:723939427008:web:0ce661dc92adb7598be325"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = firebase.firestore(); 
const auth = firebase.auth();

