// ==========================================
// 少年サッカー試合ノート
// firebase.js
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


// ==========================================
// Firebase設定
// 自分のFirebaseプロジェクトの値へ変更してください
// ==========================================

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT.firebaseapp.com",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT.appspot.com",

    messagingSenderId: "123456789",

    appId: "YOUR_APP_ID"

};


// ==========================================
// 初期化
// ==========================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);


// ==========================================
// グローバル公開
// ==========================================

window.db = db;

window.auth = auth;

window.firebaseReady = false;


// ==========================================
// 匿名認証
// ==========================================

signInAnonymously(auth)
.then(() => {

    console.log("匿名ログイン成功");

})
.catch((error)=>{

    console.error(error);

});


// ==========================================
// ログイン監視
// ==========================================

onAuthStateChanged(auth,(user)=>{

    if(!user){

        return;

    }

    console.log("UID :",user.uid);

    window.uid=user.uid;

    window.firebaseReady=true;

    initializeFirestore();

});


// ==========================================
// Firestore初期データ
// ==========================================

async function initializeFirestore(){

    await createEditingDocument();

    monitorEditing();

}


// ==========================================
// editing/current 作成
// ==========================================

async function createEditingDocument(){

    const ref=doc(db,"editing","current");

    const snap=await getDoc(ref);

    if(snap.exists()){

        return;

    }

    await setDoc(ref,{

        editing:false,

        uid:"",

        updatedAt:serverTimestamp()

    });

}


// ==========================================
// 編集状態監視
// ==========================================

function monitorEditing(){

    const ref=doc(db,"editing","current");

    onSnapshot(ref,(snapshot)=>{

        if(!snapshot.exists()){

            return;

        }

        const data=snapshot.data();

        const label=document.getElementById("editingStatus");

        if(!label){

            return;

        }

        if(data.editing){

            label.classList.remove("hidden");

        }
        else{

            label.classList.add("hidden");

        }

    });

}


// ==========================================
// 編集開始
// ==========================================

window.startEditing=async function(){

    const ref=doc(db,"editing","current");

    await updateDoc(ref,{

        editing:true,

        uid:window.uid,

        updatedAt:serverTimestamp()

    });

}


// ==========================================
// 編集終了
// ==========================================

window.finishEditing=async function(){

    const ref=doc(db,"editing","current");

    await updateDoc(ref,{

        editing:false,

        uid:"",

        updatedAt:serverTimestamp()

    });

}