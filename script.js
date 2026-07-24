// ==========================================
// 少年サッカー試合ノート
// script.js
// ==========================================

"use strict";

// 現在表示中のページ
let currentPage = "homePage";

// ==========================================
// 初期化
// ==========================================

window.addEventListener("load", async () => {

    console.log("アプリ起動");

    registerServiceWorker();

    waitFirebase();

});

// ==========================================
// Firebase接続待ち
// ==========================================

function waitFirebase() {

    const timer = setInterval(() => {

        if (!window.firebaseReady) {
            return;
        }

        clearInterval(timer);

        console.log("Firebase接続完了");

        initializeApp();

    }, 200);

}

// ==========================================
// 初期化
// ==========================================

function initializeApp() {

    showPage("homePage");

}

// ==========================================
// 画面切替
// ==========================================

window.showPage = function(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });

    const page = document.getElementById(pageId);

    if (page) {

        page.classList.add("active");

        currentPage = pageId;

    }

};

// ==========================================
// 現在画面取得
// ==========================================

window.getCurrentPage = function() {

    return currentPage;

};

// ==========================================
// 編集開始
// ==========================================

window.enterMatchPage = async function() {

    if (window.startEditing) {

        await window.startEditing();

    }

    showPage("matchPage");

};

// ==========================================
// 試合終了
// ==========================================

window.leaveMatchPage = async function() {

    if (window.finishEditing) {

        await window.finishEditing();

    }

    showPage("homePage");

};

// ==========================================
// ServiceWorker登録
// ==========================================

async function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) {

        return;

    }

    try {

        await navigator.serviceWorker.register("sw.js");

        console.log("ServiceWorker登録");

    }
    catch (e) {

        console.log(e);

    }

}

// ==========================================
// オンライン
// ==========================================

window.addEventListener("online", () => {

    console.log("オンライン");

});

// ==========================================
// オフライン
// ==========================================

window.addEventListener("offline", () => {

    alert("オフラインです");

});

// ==========================================
// Firebase接続確認
// ==========================================

window.testFirestore = async function() {

    if (!window.db) {

        alert("Firestore未接続");

        return;

    }

    console.log("Firestore OK");

};

// ==========================================
// デバッグ
// ==========================================

window.appInfo = function() {

    console.log("現在画面 :", currentPage);

    console.log("UID :", window.uid);

};

// ==========================================
// 開発用
// ==========================================

console.log("script.js 読込完了");