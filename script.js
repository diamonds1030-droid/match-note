// ==============================
// 設定
// ==============================

const MAX_PLAYERS = 30;
const STORAGE_KEY = "soccerPlayers";

let players = [];

// ==============================
// 初期化
// ==============================

window.onload = function () {

    loadPlayers();
    createPlayerList();
    createLineup();
    createSubstitutionArea();
    initializeButtons();

};

// ==============================
// 画面切替
// ==============================

function showPage(pageId) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
        page.style.display = "none";
    });

    const page = document.getElementById(pageId);

    if (pageId === "matchPage") {
        page.style.display = "flex";
    } else {
        page.style.display = "block";
    }

    page.classList.add("active");
}

// ==============================
// 選手一覧生成
// ==============================

function createPlayerList(){

    const list=document.getElementById("playerList");

    if(!list) return;

    list.innerHTML="";

    // タイトル
    const header=document.createElement("div");

    header.className="playerHeader";

    header.innerHTML=`
        <div class="playerHeaderNo">No</div>
        <div class="playerHeaderName">選手名</div>
    `;

    list.appendChild(header);

    for(let i=0;i<MAX_PLAYERS;i++){

        const row=document.createElement("div");

        row.className="playerRow";

        row.innerHTML=`

            <div class="playerNo">

                ${i+1}

            </div>

            <input
                class="playerName"
                type="text"
                maxlength="20"
                value="${players[i]}"
                data-index="${i}"

            >

        `;

        list.appendChild(row);

    }

    addInputEvents();

}

// ==============================
// 入力イベント
// ==============================

function addInputEvents(){

    document
        .querySelectorAll(".playerName")
        .forEach(input=>{

            input.addEventListener("input",function(){

                const index=this.dataset.index;

                players[index]=this.value;

            });

        });

}

// ==============================
// 保存ボタン
// ==============================

document.addEventListener("click",function(e){

    if(e.target.id==="savePlayersButton"){

        savePlayers();

    }

});

// ==============================
// 保存
// ==============================

function savePlayers(){

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(players)

    );

    alert("保存しました");

}

// ==============================
// 読込
// ==============================

function loadPlayers(){

    const data=localStorage.getItem(STORAGE_KEY);

    if(data){

        players=JSON.parse(data);

    }

    while(players.length<MAX_PLAYERS){

        players.push("");

    }

}

// ==============================
// 出場選手一覧生成
// ==============================

function createLineup() {

    const area = document.getElementById("lineupArea");

    if (!area) return;

    area.innerHTML = "";

    const positions = [
        "GK",
        "FP1",
        "FP2",
        "FP3",
        "FP4",
        "FP5",
        "FP6",
        "FP7"
    ];

    positions.forEach(position => {

        const row = document.createElement("div");

        row.className = "lineupRow";

        row.innerHTML = `
            <label>${position}</label>

            <select class="lineupSelect">
                ${createPlayerOptions()}
            </select>

            <button class="goalButton">
                得点
            </button>
        `;

        const button = row.querySelector(".goalButton");

        const select = row.querySelector("select");

        button.addEventListener("click", () => {

            if (select.value === "") {

                alert("選手を選択してください");

                return;

            }

            goalButtonClick(select.value);

        });

        area.appendChild(row);

    });

}

// ==============================
// 交代欄生成
// ==============================

function createSubstitutionArea() {

    const area = document.getElementById("substitutionArea");

    if (!area) return;

    area.innerHTML = "";

    for (let i = 1; i <= 3; i++) {

        const card = document.createElement("div");

        card.className = "subCard";

        card.innerHTML = `

            <h4>交代 ${i}</h4>

            <div class="subRow">

                <label>OUT</label>

                <select>

                    ${createPlayerOptions()}

                </select>

            </div>

            <div class="subRow">

                <label>IN</label>

                <select>

                    ${createPlayerOptions()}

                </select>

            </div>

        `;

        area.appendChild(card);

    }

}

// ==============================
// プルダウン生成
// ==============================

function createPlayerOptions(){

    let html = "";

    html += `<option value="">選択してください</option>`;

    players.forEach(player=>{

        if(player==="") return;

        html += `

            <option value="${player}">

                ${player}

            </option>

        `;

    });

    return html;

}

// ==============================
// 得点ボタン生成
// ==============================

function createGoalButtons(){

    const area = document.getElementById("goalArea");

    if(!area){
        return;
    }

    area.innerHTML = "";

    players.forEach(player => {

        if(player === ""){
            return;
        }

        const button = document.createElement("button");

        button.className = "goalButton";

        button.textContent = player;

        button.addEventListener("click", () => {

            goalButtonClick(player);

        });

        area.appendChild(button);

    });

    createSpecialGoalButtons();

}

// ==============================
// 特殊得点ボタン
// ==============================

function createSpecialGoalButtons(){

    const area = document.getElementById("goalArea");

    const ownGoalButton = document.createElement("button");

    ownGoalButton.className = "goalButton";

    ownGoalButton.textContent = "オウンゴール";

    ownGoalButton.addEventListener("click", () => {

        goalButtonClick("オウンゴール");

    });

    area.appendChild(ownGoalButton);


    const opponentButton = document.createElement("button");

    opponentButton.className = "goalButton";

    opponentButton.textContent = "相手得点";

    opponentButton.addEventListener("click", () => {

        goalButtonClick("相手得点");

    });

    area.appendChild(opponentButton);

}

// ==============================
// 得点処理
// ==============================

function goalButtonClick(name) {

    const history = document.getElementById("goalHistory");

    if (!history) return;

    if (history.textContent === "まだ得点はありません") {
        history.innerHTML = "";
    }

    const item = document.createElement("div");

    item.className = "goalItem";

    item.textContent = name;

    history.appendChild(item);

    console.log(name + " 得点");

}

// ==============================
// ボタンイベント
// ==============================

function initializeButtons() {

    // ホーム画面
    document.getElementById("playerButton").addEventListener("click", () => {
        showPage("playerPage");
    });

    document.getElementById("matchButton").addEventListener("click", () => {
        showPage("matchPage");
    });

    document.getElementById("historyButton").addEventListener("click", () => {
        showPage("historyPage");
    });

    // 戻るボタン
    document.querySelectorAll(".backButton").forEach(button => {

        button.addEventListener("click", () => {

            showPage("homePage");

        });

    });
    // オウンゴール
document.getElementById("ownGoalButton")?.addEventListener("click", () => {
    goalButtonClick("オウンゴール");
});

// 相手得点
document.getElementById("opponentGoalButton")?.addEventListener("click", () => {
    goalButtonClick("相手得点");
});

}
