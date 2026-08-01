2

// =================================
// Firebase
// =================================
import {
    db,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    deleteDoc
}
from "./firebase.js";

// ==============================
// 設定
// ==============================

const MAX_PLAYERS = 30;

let players = [];
// 選手登録用
let currentPlayerTeamId = "";
// 試合ノート用
let teams = [];
let currentTournamentId="";
let deleteTournamentId = "";

function createEmptyMatch(){

    return {

        homeTeam:"",
        awayTeam:"",
        
        homeScore:0,
        awayScore:0,

        lineup:{
            GK:"",
            FP1:"",
            FP2:"",
            FP3:"",
            FP4:"",
            FP5:"",
            FP6:"",
            FP7:""
        },

        substitutions:Array.from(
            {length:10},
            ()=>({
                out:"",
                in:"",
                done:false
            })
        ),

        goals:[],
        undoStack:[]
    };

}

const tournament={

    date:"",
    place:"",

    matches:[
        createEmptyMatch()
    ],

    currentMatch:0

};

// ==============================
// 初期化
// ==============================

window.onload = async function(){
    try{
        await loadTeams();
    }
    catch(e){
        alert("loadTeamsエラー");
    }
    createPlayerList();
    initializeButtons();
    refreshMatch();
    loadTournamentList();
}

function refreshMatch(){

    createMatchTabs();
    updateScore();
    createLineup();
    createSubstitutionArea();
    drawGoalHistory();
    // ==========================
    // 大会情報を試合ノートへ反映
    // ==========================

    const matchDate =
        document.getElementById("matchDate");
    const matchPlace =
        document.getElementById("matchPlace");
    if(matchDate){
        matchDate.value =
            tournament.date || "";
    }
    if(matchPlace){
        matchPlace.value =
            tournament.place || "";
    }

}

// ==============================
// 共通ダイアログ
// ==============================
function openDialog({
    title,
    content,
    buttons
}){

    const dialogTitle =
        document.getElementById("dialogTitle");
    const dialogContent =
        document.getElementById("dialogContent");
    const dialogButtons =
        document.getElementById("dialogButtons");
    const commonDialog =
        document.getElementById("commonDialog");
    if(dialogTitle) dialogTitle.innerHTML = title;
    if(dialogContent) dialogContent.innerHTML = content;
    if(dialogButtons) dialogButtons.innerHTML = "";
    buttons.forEach(btn=>{
        const button=document.createElement("button");
        button.textContent=btn.text;
        if(btn.className)
            button.className=btn.className;
        button.onclick=()=>{
            if(btn.onclick)
                btn.onclick();
            closeDialog();
        };

        if(dialogButtons) dialogButtons.appendChild(button);

    });

    if(commonDialog) commonDialog.classList.add("show");

}

function closeDialog(){

    const commonDialog =
        document.getElementById("commonDialog");

    if(commonDialog) commonDialog.classList.remove("show");

}
// ==============================
// 画面切替
// ==============================

function showPage(pageId) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
        page.style.display = "none";
    });

    const page = document.getElementById(pageId);

    if (page) {
        if (pageId === "matchPage") {
            page.style.display = "flex";
        } else {
            page.style.display = "block";
        }

        page.classList.add("active");
    }
    updateHeader(pageId);
}

// ==============================
// 共通ヘッダー化
// ==============================
const HEADER_CONFIG = {

    teamPage:{
        title:"チーム管理",
        buttons:`
            <button id="addTeamButton" class="iconButton">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
        `
    },

    playerPage:{
        title:"選手登録",
        buttons:`
            <button id="savePlayersButton" class="iconButton">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
        `
    },

    matchPage:{
        title:"試合ノート",
        buttons:`
            <button id="undoButton" class="iconButton">
                <i class="fa-solid fa-rotate-left"></i>
            </button>

            <button id="saveMatchButton" class="iconButton">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
        `
    },

    historyPage:{
        title:"試合履歴",
        buttons:""
    }

};
function updateHeader(pageId){

    const header = document.getElementById("commonHeader");
    const title = document.getElementById("headerTitle");
    const right = document.getElementById("headerRight");

    if(!header) return;

    if(pageId === "homePage"){
        header.style.display = "none";
        return;
    }

    header.style.display = "flex";

    const config = HEADER_CONFIG[pageId];

    if(config){
        if(title) title.textContent = config.title;
        if(right) right.innerHTML = config.buttons;
    }else{
        if(title) title.textContent = "";
        if(right) right.innerHTML = "";
    }

    initializeHeaderButtons();

}

function initializeHeaderButtons(){

    document.getElementById("headerHomeButton")?.addEventListener("click", ()=>{
        showPage("homePage");
    });

    document.getElementById("addTeamButton")?.addEventListener("click", ()=>{
        openDialog({
            title:"チーム作成",
            content:`
                <input id="newTeamName"
                class="teamNameInput"
                placeholder="チーム名">
            `,
            buttons:[
                {
                    text:"作成",
                    onclick:createTeam
                },
                {
                    text:"キャンセル"
                }
            ]
        });
    });

    document.getElementById("savePlayersButton")?.addEventListener("click", ()=>{
        savePlayers();
    });

    document.getElementById("undoButton")?.addEventListener("click", undo);

    document.getElementById("saveMatchButton")?.addEventListener("click", saveTournament);

}

// ==============================
// 大会ID生成
// ==============================
function generateTournamentId(){
    const chars=
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id="";
    for(let i=0;i<6;i++){
        id+=chars[
            Math.floor(
                Math.random()*chars.length
            )
        ];
    }
    return id;
}

//===============================
// 新しい大会作成
//===============================
async function createTournament(){

    const name =
        document
        .getElementById("tournamentName")
        .value
        .trim();


    if(name===""){

        alert("大会名を入力してください");
        return;

    }

    tournament.id =
        generateTournamentId();

    tournament.name =
        name;

    tournament.date =
        document.getElementById("tournamentDate").value;

    tournament.place =
        document.getElementById("tournamentPlace").value;
    
    tournament.currentMatch =
        0;

    tournament.matches =
    [
        createEmptyMatch()
    ];


    try{

        console.log(
            "保存開始",
            tournament
        );


        await setDoc(
            doc(
                db,
                "tournaments",
                tournament.id
            ),
            tournament
        );

        console.log(
            "Firestore保存完了"
        );

        alert(
            "大会を作成しました\n大会ID：" +
            tournament.id
        );
        refreshMatch();

        showPage(
            "matchPage"
        );


    }
    catch(e){

        console.log(e);

        alert(
            "大会作成に失敗しました"
        );

    }

}


//===============================
// 大会保存
//===============================
async function saveTournament(){

    if(!tournament.id){
        alert("大会を作成してください");
        return;
    }
    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];

matchState.homeTeamId =
    document.getElementById("homeTeamSelect").value;

//ホームチームの新旧データ読み込み
const team =
    teams.find(
        t =>
            t.id===matchState.homeTeamId ||
            t.teamName===matchState.homeTeam
    );
matchState.homeTeam =
    team ? team.teamName : "";

matchState.awayTeam =
    document
    .getElementById("awayTeam")
    .value;
    try{
        await setDoc(
            doc(
                db,
                "tournaments",
                tournament.id
            ),
            tournament
        );
        loadTournamentList();
        alert("保存しました");
    }
    catch(e){
        console.log(e);
        alert("保存失敗");
    }
}

//===============================
// 試合ノート一覧取得
//===============================

async function loadTournamentList(){
        
    const area =
        document.getElementById("historyList");
    if(!area) return;
    area.innerHTML="";
    const snapshot =
        await getDocs(
            collection(db,"tournaments")
        );
    // 配列化
    const tournaments = [];
    snapshot.forEach(docSnap=>{
        tournaments.push(
            docSnap.data()
        );
    });
    // 日付の新しい順に並び替え
    tournaments.sort((a,b)=>{
        return new Date(b.date) - new Date(a.date);
    });
    
    tournaments.forEach(data=>{


        const card=document.createElement("div");
        card.className="historySwipe";
        card.innerHTML=`
        <div class="historyDelete">
        削除
        </div>
        <div class="historyContent">
            <div class="historyTitle">
                ${data.name}
            </div>
            <div class="historyInfo">
                <span>${data.date || "未設定"}</span>
            <span>${data.matches.length}試合</span>
            </div>
        </div>

        `;
        //カードタップ
        const content =
    card.querySelector(".historyContent");
content.onclick=()=>{

    if(content.classList.contains("open")){
        return;
    }

    loadTournament(data.id);

};
        //削除ボタン
        const deleteButton = card.querySelector(".historyDelete");

        deleteButton.onclick=(e)=>{

    e.stopPropagation();

    deleteTournamentId=data.id;

    openDialog({

        title:"試合ノート削除",

        content:
        `
        <p>${data.name}</p>
        <p>削除しますか？</p>
        `,

        buttons:[

            {
                text:"キャンセル"
            },

            {
                text:"削除",
                className:"deleteButton",
                onclick:async()=>{

                    await deleteDoc(
                        doc(
                            db,
                            "tournaments",
                            deleteTournamentId
                        )
                    );

                    await loadTournamentList();

                }
            }

        ]

    });

};

        let startX=0;

content.addEventListener(
    "touchstart",
    e=>{
        startX=
            e.touches[0].clientX;
    }
);

content.addEventListener(
    "touchend",
    e=>{

        const diff=
            startX-
            e.changedTouches[0].clientX;

        if(diff>50){

            content.classList.add("open");

        }

        if(diff<-50){

            content.classList.remove("open");

        }

    }
);

        area.appendChild(card);

    });

}

//===============================
// 大会読込
//===============================
async function loadTournament(id){

    try{

        const snapshot = await getDoc(
            doc(
                db,
                "tournaments",
                id
            )
        );

        if(!snapshot.exists()){
            alert("大会がありません");
            return;
        }

        // 大会データを復元
        Object.assign(
            tournament,
            snapshot.data()
        );

        // 現在表示する試合
        const matchState =
            tournament.matches[
                tournament.currentMatch
            ];

        // 画面更新
        refreshMatch();

        // チーム名を画面へ反映
        const team = teams.find(
            t => t.id === matchState.homeTeamId
        );
        const awayInput = document.getElementById("awayTeam");
        if(awayInput) awayInput.value = matchState.awayTeam || "";

if (team) {

    const homeSelect = document.getElementById("homeTeamSelect");
    if(homeSelect) homeSelect.value = team.id;

    players = [...team.players];

    createLineup();
    createSubstitutionArea();

}

        // 得点表示用チーム名も更新

        // 試合ノート画面へ移動
        showPage("matchPage");

        alert("読込しました");

    }
    catch(e){

        console.log(e);
        alert("読込に失敗しました");

    }

}
//===============================
// チーム作成
//===============================
async function createTeam(){

    const name =
        document
        .getElementById("newTeamName")
        .value
        .trim();

    if(name===""){
        alert("チーム名を入力してください");
        return;
    }

    const id =
        "TEAM_" + Date.now();

    await setDoc(
        doc(db,"teams",id),
        {
            id:id,
            teamName:name,
            players:Array(30).fill("")
        }
    );

    await loadTeams();

}
//===============================
// チーム一覧取得
//===============================

async function loadTeams(){

    const snapshot =
        await getDocs(
            collection(
                db,
                "teams"
            )
        );
    teams=[];
    snapshot.forEach(docSnap=>{
        teams.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });
    createTeamList();
    createPlayerTeamSelect();
    createHomeTeamSelect();

}

// ===============================
// チーム一覧生成（試合履歴と完全に同一のスワイプ構造）
// ===============================
function createTeamList() {
    const list = document.getElementById("teamList");
    if (!list) return;

    // 1. サブタイトル（固定）の共通設定
    let header = document.getElementById("teamListHeader");
    if (!header) {
        header = document.createElement("div");
        header.id = "teamListHeader";
        header.className = "playerHeader";
        header.innerHTML = `<div class="playerHeaderName">登録済みチーム一覧</div>`;
        list.parentNode.insertBefore(header, list); // list の外側（手前）に固定配置
    }

    // 2. リスト内のみ初期化（固定サブタイトルは消えない）
    list.innerHTML = "";
    
    //const area = document.getElementById("teamList");
    //if (!area) return;
    //area.innerHTML = "";
    // --- JavaScriptでタイトル（ヘッダー）を動的に生成 ---
    //const header = document.createElement("div");
    //header.className = "playerHeader"; // 選手一覧と同じスタイルクラス（固定表示用）
    //header.innerHTML = `
  //      <div class="playerHeaderName">登録済みチーム一覧</div>
    //`;
    //area.appendChild(header);
    // ---------------------------------------------------

    teams.forEach(team => {
        const card = document.createElement("div");
        card.className = "historySwipe";

        card.innerHTML = `
            <div class="historyDelete">削除</div>
            <div class="historyContent">
                <div class="historyTitle">${team.teamName}</div>
                <div class="historyInfo">
                    <span>登録選手: ${team.players ? team.players.filter(p => p !== "").length : 0}名</span>
                </div>
            </div>
        `;

        const content = card.querySelector(".historyContent");

        // カードタップ：選手登録画面へ移動
        content.onclick = async () => {
            if (content.classList.contains("open")) {
                content.classList.remove("open");
                return;
            }

            currentPlayerTeamId = team.id;
            showPage("playerPage");

            const select = document.getElementById("teamSelect");
            if (select) select.value = team.id;

            const snapshot = await getDoc(doc(db, "teams", team.id));
            if (snapshot.exists()) {
                const data = snapshot.data();
                players = [...(data.players || [])];
                createPlayerList();
            }
        };

        // 削除ボタンタップ
        const deleteButton = card.querySelector(".historyDelete");
        deleteButton.onclick = (e) => {
            e.stopPropagation();

            openDialog({
                title: "チーム削除",
                content: `
                    <p><strong>${team.teamName}</strong></p>
                    <p>このチームを削除しますか？</p>
                `,
                buttons: [
                    {
                        text: "キャンセル"
                    },
                    {
                        text: "削除",
                        className: "deleteButton",
                        onclick: async () => {
                            await deleteDoc(doc(db, "teams", team.id));
                            await loadTeams();
                        }
                    }
                ]
            });
        };

        // スワイプ処理（試合履歴画面と全く同じイベント判定）
        let startX = 0;
        content.addEventListener("touchstart", e => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        content.addEventListener("touchend", e => {
            const diff = startX - e.changedTouches[0].clientX;
            if (diff > 50) {
                content.classList.add("open");
            }
            if (diff < -50) {
                content.classList.remove("open");
            }
        });

        list.appendChild(card);
    });
}


// ==============================
// チーム選択　選手登録画面
// ==============================
function createPlayerTeamSelect(){

    const select =
        document.getElementById("teamSelect");

    if(!select) return;

    select.innerHTML =
        '<option value="">チーム選択Java</option>';

    teams.forEach(team=>{

        const option =
            document.createElement("option");

        option.value = team.id;
        option.textContent = team.teamName;

        select.appendChild(option);

    });

}


// ==============================
// 選手登録画面　選手一覧生成
// ==============================

function createPlayerList(){

    const list = document.getElementById("playerList");
    if (!list) return;

    // 1. サブタイトル（固定）の共通設定
    let header = document.getElementById("playerListHeader");
    if (!header) {
        header = document.createElement("div");
        header.id = "playerListHeader";
        header.className = "playerHeader";
        header.innerHTML = `
            <div class="playerHeaderNo">No</div>
            <div class="playerHeaderName">選手名</div>
        `;
        list.parentNode.insertBefore(header, list); // list の外側（手前）に固定配置
    }

    // 2. リスト内のみ初期化
    list.innerHTML = "";
    //const list=document.getElementById("playerList");
    //if(!list) return;
    //list.innerHTML="";
    // タイトル
    //const header=document.createElement("div");
    //header.className="playerHeader";
    //header.innerHTML=`
   //     <div class="playerHeaderNo">No</div>
   //     <div class="playerHeaderName">選手名</div>
//    `;

    //list.appendChild(header);

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
                value="${players[i] || ''}"
                data-index="${i}"

            >

        `;

        list.appendChild(row);

    }

    addInputEvents();

}

// ==============================
// チーム選択　試合ノート画面
// ==============================

function createHomeTeamSelect(){

    const select =
        document.getElementById("homeTeamSelect");

    if(!select) return;

    select.innerHTML =
        '<option value="">チーム選択Java script</option>';

    teams.forEach(team=>{

        const option =
            document.createElement("option");

        option.value = team.id;
        option.textContent = team.teamName;

        select.appendChild(option);

    });

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
// 保存
// ==============================
async function savePlayers(){

    if(currentPlayerTeamId===""){

        alert(
            "チームを選択してください"
        );
        return;
    }
    await setDoc(
        doc(
            db,
            "teams",
            currentPlayerTeamId
        ),
        {
            players:players
        },
        {
            merge:true
        }
    );
    await loadTeams();
    alert("選手を保存しました");
}

// ==============================
// 操作の戻り
// ==============================
function saveUndo(){

    const matchState =
        tournament.matches[
            tournament.currentMatch
        ];

    matchState.undoStack.push(

        JSON.stringify({

            homeScore:matchState.homeScore,
            awayScore:matchState.awayScore,

            lineup:structuredClone(matchState.lineup),

            substitutions:structuredClone(
                matchState.substitutions
            ),

            goals:structuredClone(
                matchState.goals
            )

        })

    );

}
// ==============================
// タブ生成
// ==============================
function createMatchTabs(){

    const area=document.getElementById("matchTabArea");

    if(!area) return;

    area.innerHTML="";

    tournament.matches.forEach((m,index)=>{

        const tab=document.createElement("button");

        tab.className="matchTab";

        if(index===tournament.currentMatch){

            tab.classList.add("active");

        }

        tab.textContent=(index+1)+"試合目";

        tab.onclick=()=>{

            tournament.currentMatch=index;

            refreshMatch();

        };

        area.appendChild(tab);

    });

}

// ==============================
// 出場選手一覧生成
// ==============================

function createLineup() {

    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
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

    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
    const area = document.getElementById("substitutionArea");
    if(!area) return;
    area.innerHTML = "";
    for(let i = 0; i < 10; i++){
        const sub = matchState.substitutions[i];
        const card = document.createElement("div");
        card.className = "subCard";
        card.innerHTML = `
        <h4>交代 ${i + 1}</h4>

        <div class="subRow">

            <label>OUT</label>

            ${
                sub.done
                ?
                `
                <div class="subPlayer">
                    ${sub.out}
                </div>
                `
                :
                `
                <select class="outSelect">
                    ${createOptions(getLineupPlayers())}
                </select>
                `
            }
            <label>IN</label>

            ${
                sub.done
                ?
                `
                <div class="subPlayer">
                    ${sub.in}
                </div>
                `
                :
                `
                <select class="inSelect">
                    ${createOptions(getBenchPlayers())}
                </select>
                `
            }
            <button 
                class="subButton"
                ${sub.done ? "disabled" : ""}
            >
                ${sub.done ? "済" : "交代"}
            </button>


        </div>
        `;
        const button =
            card.querySelector(".subButton");
        // 未実施の場合のみ処理
        if(!sub.done){
            const outSelect =
                card.querySelector(".outSelect");
            const inSelect =
                card.querySelector(".inSelect");
            // 選択状態を復元
            if(sub.out !== ""){
                outSelect.value = sub.out;
            }
            if(sub.in !== ""){
                inSelect.value = sub.in;
            }
            button.addEventListener("click",()=>{
                const outPlayer =
                    outSelect.value;
                const inPlayer =
                    inSelect.value;
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
        }
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
    saveUndo();
    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
    // 出場選手を変更
    Object.keys(matchState.lineup).forEach(position=>{
        if(matchState.lineup[position] === outPlayer){
            matchState.lineup[position] = inPlayer;
        }
    });
    // 実施した交代枠だけ保存
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

    const matchState =
        tournament.matches[
            tournament.currentMatch
        ];
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

    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
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

}

// ==============================
// 得点処理
// ==============================

function goalButtonClick(name) {
    saveUndo();
    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
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
            "⚽相手得点";
    }
    else{
        matchState.homeScore++;
        item.className="goalItem goalHome";
        text.textContent =
            name + " ⚽";
    }
    item.appendChild(text);
    if(history) history.appendChild(item);
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
// 得点履歴再描画
// ==============================

function drawGoalHistory() {

    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
    const history = document.getElementById("goalHistory");

    if (!history) return;

    history.innerHTML = "";

    matchState.goals.forEach(goal => {

        const item = document.createElement("div");
        const text = document.createElement("span");

        if (goal.scorer === "相手得点") {

            item.className = "goalItem goalAway";
            text.textContent = "⚽ 相手得点";

        } else {

            item.className = "goalItem goalHome";
            text.textContent = goal.scorer + " ⚽";

        }

        item.appendChild(text);
        history.appendChild(item);

    });

}
// ==============================
// 得点取り消し
// ==============================

function undoGoal() {

    const matchState =
    tournament.matches[
        tournament.currentMatch
    ];
    if (matchState.goals.length === 0) {
        alert("取り消す得点がありません");
        return;
    }

    const last = matchState.goals.pop();

    if (last.scorer === "相手得点") {
        matchState.awayScore--;
    } else {
        matchState.homeScore--;
    }

    updateScore();
    drawGoalHistory();

}
// ==============================
// 戻る操作
// ==============================
function undo(){

    const matchState =
        tournament.matches[
            tournament.currentMatch
        ];

    if(matchState.undoStack.length===0){

        alert("戻せる操作はありません");
        return;

    }

    const previous =
        JSON.parse(
            matchState.undoStack.pop()
        );

    matchState.homeScore =
        previous.homeScore;

    matchState.awayScore =
        previous.awayScore;

    matchState.lineup =
        previous.lineup;

    matchState.substitutions =
        previous.substitutions;

    matchState.goals =
        previous.goals;

    refreshMatch();

}
// ==============================
// スコア表示更新
// ==============================

function updateScore(){

    const matchState =
        tournament.matches[
            tournament.currentMatch
        ];

    const homeScoreEl = document.getElementById("homeScore");
    const awayScoreEl = document.getElementById("awayScore");

    if (homeScoreEl) homeScoreEl.textContent = matchState.homeScore;
    if (awayScoreEl) awayScoreEl.textContent = matchState.awayScore;

    const awayInput =
        document.getElementById("awayTeam");

    if (awayInput) {
        awayInput.value =
            matchState.awayTeam || "";
    }
}
// ==============================
// ホーム画面などのボタンイベント
// ==============================

function initializeButtons() {

    // 選手一覧
    document
    .getElementById("playerButton")
    ?.addEventListener("click", async()=>{

        await loadTeams();
        createPlayerList();
        showPage("playerPage");

    });

    // 試合一覧
    document.getElementById("matchButton")?.addEventListener("click", async () => {

        await loadTeams();
        createLineup();
        createSubstitutionArea();
        showPage("matchPage");

    });

    // チーム管理画面
    document.getElementById("teamButton")?.addEventListener("click",()=>{
        showPage("teamPage");
    });

    // 試合履歴
    document
    .getElementById("historyButton")
    ?.addEventListener("click", async()=>{

        await loadTournamentList();
        showPage("historyPage");

    });

    // オウンゴール
    document.getElementById("ownGoalButton")?.addEventListener("click", () => {
        goalButtonClick("オウンゴール");
    });

    // 相手得点
    document.getElementById("opponentGoalButton")?.addEventListener("click", () => {
        goalButtonClick("相手得点");
    });

    document
    .getElementById("addMatchButton")
    ?.addEventListener("click",()=>{

        tournament.matches.push(
            createEmptyMatch()
        );

        tournament.currentMatch=
            tournament.matches.length-1;

        refreshMatch();

    });

    // アウェイチーム
    const awayInput =
        document.getElementById("awayTeam");
    awayInput?.addEventListener("input", () => {

        const matchState =
            tournament.matches[
                tournament.currentMatch
            ];

        matchState.awayTeam = awayInput.value;

        createMatchTabs();

    });

    document
    .getElementById("createTournamentButton")
    ?.addEventListener("click",()=>{

        openDialog({
            title:"大会作成",
            content:`
            <input id="tournamentName">
            <input id="tournamentDate" type="date">
            <input id="tournamentPlace">

            <div>
                大会ID
                <span id="generatedTournamentId"></span>
            </div>
            `,

            buttons:[
                {
                    text:"作成",
                    onclick:createTournament
                },
                {
                    text:"キャンセル"
                }
            ]
        });

        const genId = document.getElementById("generatedTournamentId");
        if(genId) genId.textContent = generateTournamentId();
    });

    document.getElementById("homeTeamSelect")
    ?.addEventListener("change", async function () {

        const id = this.value;
        if (!id) {
            players = [];
            const matchState =
                tournament.matches[
                    tournament.currentMatch
                ];

            matchState.homeTeam = "";
            matchState.homeTeamId = "";
            updateScore();
            createLineup();
            createSubstitutionArea();

            return;
        }
        const snapshot = await getDoc(
            doc(db, "teams", id)
        );
        const team = snapshot.data();
        players = [...team.players];

        const matchState =
            tournament.matches[
                tournament.currentMatch
            ];

        matchState.homeTeam = team.teamName;
        matchState.homeTeamId = id;

        updateScore();

        createLineup();

        createSubstitutionArea();

    });

    document
    .getElementById("teamSelect")
    ?.addEventListener("change", async function(){

        const id=this.value;
        if(id===""){
            return;
        }
        currentPlayerTeamId = id;
        const snapshot =
        await getDoc(
            doc(
                db,
                "teams",
                id
            )
        );
        const data = snapshot.data();
        players = [...data.players];
        createPlayerList();
    });
}
