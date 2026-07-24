// ==============================
// 設定
// ==============================

const MAX_PLAYERS = 30;
const STORAGE_KEY = "soccerPlayers";

let players = [];

const matchState = {
    homeScore:0,
    awayScore:0,
    lineup: {
        GK: "",
        FP1: "",
        FP2: "",
        FP3: "",
        FP4: "",
        FP5: "",
        FP6: "",
        FP7: ""
    },
    substitutions: [
    { out: "", in: "", done:false },
    { out: "", in: "", done:false },
    { out: "", in: "", done:false }
　　　],
    goals: []
};

// ==============================
// 初期化
// ==============================

window.onload = function () {

    loadPlayers();
    createPlayerList();
    createLineup();
    createSubstitutionArea();
    initializeButtons();
    updateScore();

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

        // 他のポジションで選択済みの選手は候補から除外
        let options = '<option value="">選択してください</option>';

        players.forEach(player => {

            if (player === "") return;

            const used = Object.entries(matchState.lineup).some(([pos, name]) => {
                return pos !== position && name === player;
            });

            if (!used || matchState.lineup[position] === player) {

                options += `
                    <option value="${player}">
                        ${player}
                    </option>
                `;

            }

        });

        row.innerHTML = `
            <label>${position}</label>

            <select class="lineupSelect">
                ${options}
            </select>

            <button class="goalButton">
                得点
            </button>
        `;

        const select = row.querySelector(".lineupSelect");
        const button = row.querySelector(".goalButton");

        // 現在の選択を復元
        select.value = matchState.lineup[position];

        // 選手変更
        select.addEventListener("change", () => {

            matchState.lineup[position] = select.value;

            // プルダウン・交代欄を更新
            createLineup();
            createSubstitutionArea();

        });

        // 得点
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
function createSubstitutionArea(){
    const area = document.getElementById("substitutionArea");
    if(!area) return;
    area.innerHTML = "";
    for(let i = 0; i < 3; i++){
        const sub = matchState.substitutions[i];
        const card = document.createElement("div");
        card.className = "subCard";
        card.innerHTML = `
            <h4>交代 ${i + 1}</h4>
            <div class="subRow">
            ${
                sub.done
                ?
                `
<div class="subPlayer">
OUT：${sub.out}
</div>

<div class="subPlayer">
IN：${sub.in}
</div>

<button class="subButton" disabled>
済
</button>

`

:

`

<label>OUT</label>

<select class="outSelect">
    ${createOptions(getLineupPlayers())}
</select>


<label>IN</label>

<select class="inSelect">
    ${createOptions(getBenchPlayers())}
</select>


<button class="subButton">
    交代
</button>

`

}

</div>

`;
        const outSelect =
            card.querySelector(".outSelect");
        const inSelect =
            card.querySelector(".inSelect");
        const button =
            card.querySelector(".subButton");
        // ★ 過去の選択を復元
        if(sub.out !== ""){
            outSelect.value = sub.out;
        }
        if(sub.in !== ""){
            inSelect.value = sub.in;
        }
        // ★ 実行済みの場合
        if(sub.done){
            button.disabled = true;
            button.textContent = "済";
        }
        button.addEventListener("click",()=>{
            const outPlayer = outSelect.value;
            const inPlayer = inSelect.value;
            if(outPlayer === "" || inPlayer === ""){
                alert("OUTとINを選択してください");
                return;
            }
            executeSubstitution(
                outPlayer,
                inPlayer,
                i
            );
        });
        area.appendChild(card);
    }
}
// ==============================
// 交代実行
// ==============================
function executeSubstitution(
    outPlayer,
    inPlayer,
    index
){

    // 出場選手を変更
    Object.keys(matchState.lineup)
    .forEach(position=>{

        if(matchState.lineup[position] === outPlayer){
            matchState.lineup[position] = inPlayer;
        }

    });
    // 交代履歴を保存
    matchState.substitutions[index].out = outPlayer;
    matchState.substitutions[index].in = inPlayer;
    matchState.substitutions[index].done = true;
    // 表示更新
    createLineup();
    createSubstitutionArea();

}
// ==============================
// スタメン取得
// ==============================
function getLineupPlayers() {

    return Object.values(matchState.lineup)
        .filter(name => name !== "");

}

// ==============================
// ベンチ取得
// ==============================
function getBenchPlayers() {

    const lineup = getLineupPlayers();

    return players.filter(player =>
        player !== "" &&
        !lineup.includes(player)
    );

}

// ==============================
// 交代用プルダウン生成
// ==============================
function createOptions(list){

    let html='<option value="">選択してください</option>';

    list.forEach(player=>{

        html+=`<option>${player}</option>`;

    });

    return html;

}

// ==============================
// プルダウン生成
// ==============================

function createPlayerOptions(position) {

    let html = '<option value="">選択してください</option>';

    players.forEach(player => {

        if (player === "") return;

        const selected = Object.entries(matchState.lineup).some(([pos, name]) => {
            return pos !== position && name === player;
        });

        if (!selected) {
            html += `<option value="${player}">${player}</option>`;
        }

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
// 得点処理
// ==============================

function goalButtonClick(name) {
    const history =
        document.getElementById("goalHistory");
    const item =
        document.createElement("div");
    const text =
        document.createElement("span");
    // 相手得点
    if(name === "相手得点"){
        matchState.awayScore++;
        item.className="goalItem goalAway";
        text.textContent =
            "相手得点";
    }
    else{
        matchState.homeScore++;
        item.className="goalItem goalHome";
        text.textContent =
            name + " ⚽";
    }
    item.appendChild(text);
    history.appendChild(item);
    updateScore();
    matchState.goals.push({
        scorer:name,
        homeScore:
            matchState.homeScore,
        awayScore:
            matchState.awayScore
    });
}

// ==============================
// スコア表示更新
// ==============================

function updateScore(){
    const home =
        document.getElementById("homeScore");
    const away =
        document.getElementById("awayScore");
    if(home){
        home.textContent =
            matchState.homeScore;
    }
    if(away){
        away.textContent =
            matchState.awayScore;
    }
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
