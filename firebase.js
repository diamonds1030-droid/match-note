// ==========================================
// 少年サッカー試合ノート
// firebase.js
// ==========================================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyF4SN3omtRILSo_TazmAJJXadegj_aic",
  authDomain: "match-note.firebaseapp.com",
  projectId: "match-note",
  storageBucket: "match-note.firebasestorage.app",
  messagingSenderId: "878349586781",
  appId: "1:878349586781:web:7bef8b524716f86931d8b4",
  measurementId: "G-Z04TCV21P7"
};
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export { doc, setDoc, getDoc };
