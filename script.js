// ==============================
// 設定
// ==============================

const MAX_PLAYERS = 30;

// 選手データ
const players = [];


// ==============================
// 初期化
// ==============================

window.onload = function () {

    createPlayerList();

};


// ==============================
// 画面切替
// ==============================

function showPage(pageId){

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {

        page.classList.remove("active");

    });

    document
        .getElementById(pageId)
        .classList
        .add("active");

}


// ==============================
// 選手一覧生成
// ==============================

function createPlayerList(){

    const list = document.getElementById("playerList");

    if(!list){
        return;
    }

    // タイトル
    list.innerHTML = `
        <div class="playerHeader">
            <div class="playerHeaderNo">No</div>
            <div class="playerHeaderName">選手名</div>
        </div>
    `;

    players.length = 0;

    for(let i = 1; i <= MAX_PLAYERS; i++){

        players.push({
            number: i,
            name: ""
        });

        const row = document.createElement("div");

        row.className = "playerRow";

        row.innerHTML = `
            <div class="playerNo">${i}</div>

            <input
                class="playerName"
                type="text"
                maxlength="20"
                placeholder="選手名"
                data-index="${i-1}">
        `;

        list.appendChild(row);

    }

}