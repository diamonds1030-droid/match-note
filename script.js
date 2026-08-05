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

function createEmptyMatch() {
    return {
        homeTeamId: "",
        homeTeam: "",
        awayTeam: "",
        homeScore: 0,
        awayScore: 0,
        lineup: {
            GK: "", FP1: "", FP2: "", FP3: "", FP4: "", FP5: "", FP6: "", FP7: ""
        },
        // ★各試合で独立した交代履歴配列
        substitutions: [],
        goals: [],
        undoStack: []
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

function refreshMatch() {
    createMatchTabs();
    
    // 現在選択されている試合データを取得
    const matchState = tournament.matches[tournament.currentMatch];
    const homeSelect = document.getElementById("homeTeamSelect");

    if (matchState) {
        // 1. ホームチーム選択肢の反映
        if (homeSelect) {
            homeSelect.value = matchState.homeTeamId || "";
        }

        // ★2. 【原因解決の要】選択されているチームの選手データ（players）を復元
        if (matchState.homeTeamId) {
            const team = teams.find(t => t.id === matchState.homeTeamId);
            players = team ? [...(team.players || [])] : [];
        } else {
            // チーム未選択、または最初のチームをデフォルトセットする場合
            if (teams.length > 0) {
                // 必要に応じて最初のチームをセットするか、空配列にする
                players = [...(teams[0].players || [])];
            } else {
                players = [];
            }
        }
    }

    updateScore();
    drawGoalHistory();
    renderSubHistory();

    // 大会情報（日付・会場・大会名）の反映
    const matchDate = document.getElementById("matchDate");
    const matchPlace = document.getElementById("matchPlace");
    const matchName = document.getElementById("matchName");

    if (matchDate)  matchDate.value  = tournament.date  || "";
    if (matchPlace) matchPlace.value = tournament.place || "";
    if (matchName)  matchName.value  = tournament.name  || "";
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
    if (pageId !== 'playerPage') {
        resetPlayerPage();
    }
    updateHeader(pageId);
}

function resetPlayerPage() {
    currentPlayerTeamId = ""; // 選択中チームIDをクリア
    
    // メモリ上の選手データ配列をクリア
    players = []; 
    
    const select = document.getElementById("teamSelect");
    if (select) {
        select.value = ""; // ドロップダウンを初期化
    }
    
    // HTMLの描画エリアのみ直接クリアする（createPlayerListは呼ばない）
    const playerList = document.getElementById("playerList");
    if (playerList) {
        playerList.innerHTML = "";
    }
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
            <button id="backToTeamPageButton" class="iconButton" title="チーム管理へ">
                <i class="fas fa-user-friends"></i>
            </button>
            <button id="savePlayersButton" class="iconButton">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </button>
        `
    },

    matchPage:{
        title:"試合ノート",
        buttons:`
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

// ==============================
// 共通ヘッダー表示切り替え（修正版）
// ==============================
function updateHeader(pageId){

    const header = document.getElementById("commonHeader");
    const title = document.getElementById("headerTitle");
    const right = document.getElementById("headerRight");

    if(!header) return;

    if(pageId === "homePage"){
        header.style.display = "none";
        return;
    }

    // 不要な style.width や style.boxSizing は削除し、表示切り替えのみ行う
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


// ==============================
// 共通ヘッダー初期化
// ==============================
function initializeHeaderButtons(){

    // --- レイアウトやCSSクラスを100%保持するイベント登録ヘルパー ---
    const bindSingleClick = (id, handler) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        // 既に登録済みのイベントリスナーがあれば削除
        if (el._currentClickHandler) {
            el.removeEventListener("click", el._currentClickHandler);
        }
        
        // 新しいハンドラを保存してバインド
        el._currentClickHandler = handler;
        el.addEventListener("click", handler);
    };

    bindSingleClick("headerHomeButton", () => {
        showPage("homePage");
    });

    bindSingleClick("addTeamButton", () => {
        openDialog({
            title:"チーム作成",
            content:`<input id="newTeamName" class="teamNameInput" placeholder="チーム名">`,
            buttons:[
                { text:"作成", onclick:createTeam },
                { text:"キャンセル" }
            ]
        });
    });

    bindSingleClick("backToTeamPageButton", () => {
        showPage("teamPage");
    });

    bindSingleClick("savePlayersButton", () => {
        savePlayers();
    });

    // 【得点のみ1回戻す】
    bindSingleClick("undoButton", () => {
        const matchState = tournament.matches[tournament.currentMatch];
        if (matchState && matchState.goals && matchState.goals.length > 0) {
            const lastGoal = matchState.goals.pop(); // 1件のみ削除
            
            if (lastGoal.scorer === "相手得点") {
                matchState.awayScore = Math.max(0, matchState.awayScore - 1);
            } else {
                matchState.homeScore = Math.max(0, matchState.homeScore - 1);
            }
            
            updateScore();
            drawGoalHistory();
        } else {
            alert("取り消す得点がありません");
        }
    });

    // 【交代履歴のみ1回戻す】
    bindSingleClick("undoSubButton", () => {
        const matchState = tournament.matches[tournament.currentMatch];
        if (matchState && matchState.substitutions && matchState.substitutions.length > 0) {
            matchState.substitutions.pop(); // 1件のみ削除
            renderSubHistory();
        } else {
            alert("取り消す交代履歴はありません");
        }
    });

    bindSingleClick("saveMatchButton", saveTournament);
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
    const nameEl = document.getElementById("tournamentName");
    const dateEl = document.getElementById("tournamentDate");
    const placeEl = document.getElementById("tournamentPlace");
    const genIdEl = document.getElementById("generatedTournamentId");

    const name = nameEl ? nameEl.value.trim() : "";

    if(name === ""){
        alert("大会名を入力してください");
        return;
    }

    tournament.id = genIdEl ? genIdEl.textContent : generateTournamentId();
    tournament.name = name;
    tournament.date = dateEl ? dateEl.value : "";
    tournament.place = placeEl ? placeEl.value : "";
    tournament.currentMatch = 0;
    tournament.matches = [createEmptyMatch()];

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
// 大会読込（確実な選手リスト復元版）
//===============================
async function loadTournament(id){

    try{
        // もし teams がまだ取得できていなければ取得する
        if (!teams || teams.length === 0) {
            await loadTeams();
        }

        const snapshot = await getDoc(doc(db, "tournaments", id));

        if(!snapshot.exists()){
            alert("大会がありません");
            return;
        }

        // 大会データを復元
        Object.assign(tournament, snapshot.data());

        // ★ 1試合目（インデックス 0）を強制的にカレントにする
        tournament.currentMatch = 0;

        // ★ refreshMatch 内で players 配列の復元・画面同期を一括処理
        refreshMatch();

        // 試合ノート画面へ移動
        showPage("matchPage");

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
        '<option value="">チームを選択して下さい</option>';

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
        '<option value="">チームを選択してください</option>';

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

    // ドロップダウンから現在の選択値を取得（念のため同期）
    const select = document.getElementById("teamSelect");
    if (select && select.value) {
        currentPlayerTeamId = select.value;
    }

    if(currentPlayerTeamId===""){
        alert("チームを選択してください");
        return;
    }

    // ★ 選択中のチームIDを変数に保持しておく
    const savedTeamId = currentPlayerTeamId;

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

    // チーム一覧を再読み込み（ここでドロップダウンが初期化される）
    await loadTeams();

    // ★ 修正箇所：保持しておいたチームIDを再セットして表示を復元！
    if (select) {
        select.value = savedTeamId;
    }
    currentPlayerTeamId = savedTeamId;

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
// 出場選手（スタメン）一覧生成（修正版）
// ==============================
function createLineup() {
    const matchState = tournament.matches[tournament.currentMatch];
    const area = document.getElementById("lineupArea");

    if (!area || !matchState) return;

    area.innerHTML = "";

    const positions = ["GK", "FP1", "FP2", "FP3", "FP4", "FP5", "FP6", "FP7"];

    // ★ 1. 試合データに記録されている全選手（スタメン＋控え等）とグローバルの players を統合
    const lineupNames = Object.values(matchState.lineup).filter(name => name !== "");
    const subOutNames = matchState.substitutions ? matchState.substitutions.map(s => s.out) : [];
    const subInNames = matchState.substitutions ? matchState.substitutions.map(s => s.in) : [];
    
    // 現在保持している選手リスト + 試合データに存在する選手名を統合（重複除外）
    const allAvailablePlayers = Array.from(new Set([
        ...(Array.isArray(players) ? players : []),
        ...lineupNames,
        ...subOutNames,
        ...subInNames
    ])).filter(name => name !== "");

    positions.forEach(position => {
        const row = document.createElement("div");
        row.className = "lineupRow";

        let options = '<option value="">選択してください</option>';
        const currentSelectedPlayer = matchState.lineup[position] || "";

        // ★ 2. 重複チェックを行いながら選択肢を作成
        allAvailablePlayers.forEach(player => {
            // 他のポジションで使われているか判定
            const usedInOtherPos = Object.entries(matchState.lineup).some(([pos, name]) => {
                return pos !== position && name === player;
            });

            // 他で使われていない、または「まさにこのポジションで選択中の選手」なら選択肢に追加
            if (!usedInOtherPos || player === currentSelectedPlayer) {
                options += `<option value="${player}">${player}</option>`;
            }
        });

        row.innerHTML = `
            <label>${position}</label>
            <select class="lineupSelect">${options}</select>
        `;

        const select = row.querySelector(".lineupSelect");
        // ★ 3. 明示的に値をセット
        select.value = currentSelectedPlayer;

        select.addEventListener("change", () => {
            matchState.lineup[position] = select.value;
            if (typeof createSubstitutionArea === "function") {
                createSubstitutionArea();
            }
        });

        area.appendChild(row);
    });
}



/**
 * 現在ピッチ上に出場している選手の一覧を取得（スタメン + 交代反映）
 */
function getCurrentPitchPlayers() {
    const matchState = tournament.matches[tournament.currentMatch];
    if (!matchState) return [];

    let currentPlayers = Object.values(matchState.lineup).filter(name => name !== "");

    matchState.substitutions.forEach(sub => {
        if (sub.done) {
            currentPlayers = currentPlayers.filter(p => p !== sub.out);
            if (sub.in && !currentPlayers.includes(sub.in)) {
                currentPlayers.push(sub.in);
            }
        }
    });

    return currentPlayers;
}



/**
 * 得点入力用の選手ボタン（＋オウンゴール／相手得点）を生成
 */
function createDrawerGoalButtons(container) {
    container.innerHTML = "";

    const pitchPlayers = getCurrentPitchPlayers();

    // 1. ピッチ上の選手ボタン
    pitchPlayers.forEach(player => {
        const btn = document.createElement("button");
        btn.className = "goalScorerBtn";
        btn.textContent = player + " ⚽";
        btn.onclick = () => {
            goalButtonClick(player);
            alert(`${player} の得点を記録しました！`);
        };
        container.appendChild(btn);
    });

    // 2. オウンゴールボタン
    const ownGoalBtn = document.createElement("button");
    ownGoalBtn.className = "goalScorerBtn ownGoal";
    ownGoalBtn.textContent = "オウンゴール";
    ownGoalBtn.onclick = () => {
        goalButtonClick("オウンゴール");
        alert("オウンゴールを記録しました");
    };
    container.appendChild(ownGoalBtn);

    // 3. 相手得点ボタン
    const opponentGoalBtn = document.createElement("button");
    opponentGoalBtn.className = "goalScorerBtn opponentGoal";
    opponentGoalBtn.textContent = "相手得点";
    opponentGoalBtn.onclick = () => {
        goalButtonClick("相手得点");
        alert("相手得点を記録しました");
    };
    container.appendChild(opponentGoalBtn);
}
// 交代処理を実行した時のJavaScript処理例
function recordSubstitution(time, playerOut, playerIn) {
    // 1. 交代履歴エリアに表示を追加
    const subHistoryContainer = document.getElementById('subHistory');
    
    const item = document.createElement('div');
    item.className = 'subHistoryItem';
    item.innerHTML = `
        <span class="subHistoryTime">${time}</span>
        <span class="subHistoryDetail">
            OUT: <span class="subOut">${playerOut}</span> ➔ IN: <span class="subIn">${playerIn}</span>
        </span>
    `;
    
    subHistoryContainer.appendChild(item);

    // ※フッターやドロワー側で参照している「スタメンリスト」のDOM/配列は更新せずそのまま保持します
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

function executeSubstitution(outPlayer, inPlayer) {
    const currentMatchIdx = tournament.currentMatch;
    const matchState = tournament.matches[currentMatchIdx];

    if (!matchState) return;

    // 該当試合に substitutions 配列がなければ初期化
    if (!Array.isArray(matchState.substitutions)) {
        matchState.substitutions = [];
    }

    // 交代データを試合ごとに追加
    matchState.substitutions.push({
        out: outPlayer,
        in: inPlayer,
        done: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 交代履歴画面を再描画
    renderSubHistory();
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

/**
 * スタメン設定画面（ドロワー内）を動的に生成して表示
 * @param {HTMLElement} container - 描画先の要素（#drawerContent）
 */
function renderLineupDrawer(container) {
    const matchState = tournament.matches[tournament.currentMatch];
    if (!matchState) return;

    // ★ 1. matchState.homeTeamId から該当チームの選手リストを直接復元（変数のズレ防止）
    let teamPlayers = [];
    if (matchState.homeTeamId) {
        const team = teams.find(t => t.id === matchState.homeTeamId);
        if (team && Array.isArray(team.players)) {
            teamPlayers = team.players.filter(p => p !== "");
        }
    }
    
    // もし teams から取れなかった場合は現在の players 配列を参照
    if (teamPlayers.length === 0 && Array.isArray(players)) {
        teamPlayers = players.filter(p => p !== "");
    }

    // ★ 2. すでにスタメンに登録されている名前も確実に統合する
    const currentLineupNames = Object.values(matchState.lineup).filter(name => name !== "");
    const allSelectablePlayers = Array.from(new Set([...teamPlayers, ...currentLineupNames]));

    const lineupBox = document.createElement("div");
    lineupBox.className = "drawerLineupContainer";

    const positions = ["GK", "FP1", "FP2", "FP3", "FP4", "FP5", "FP6", "FP7"];

    // 各ポジションの行を生成
    positions.forEach(position => {
        const row = document.createElement("div");
        row.className = "lineupRow";

        const label = document.createElement("label");
        label.textContent = position;

        const select = document.createElement("select");
        select.className = "lineupSelect";
        select.dataset.position = position;

        // 選手選択肢の生成
        let optionsHtml = '<option value="">未選択</option>';
        allSelectablePlayers.forEach(player => {
            if (!player) return;
            optionsHtml += `<option value="${player}">${player}</option>`;
        });

        select.innerHTML = optionsHtml;
        select.value = matchState.lineup[position] || "";

        // 値が変更された時のイベント処理
        select.addEventListener("change", (e) => {
            matchState.lineup[position] = e.target.value;
            
            if (typeof createSubstitutionArea === "function") {
                createSubstitutionArea();
            }
            
            updateLineupSelectDisabledState(lineupBox);
        });

        row.appendChild(label);
        row.appendChild(select);
        lineupBox.appendChild(row);
    });

    container.innerHTML = "";
    container.appendChild(lineupBox);

    // 初回描画時にも重複制御を適用
    updateLineupSelectDisabledState(lineupBox);
}


/**
 * 選択済みの選手が他のポジションで選べないよう `<option>` の disabled を切り替えるヘルパー関数
 */
function updateLineupSelectDisabledState(container) {
    const selects = Array.from(container.querySelectorAll(".lineupSelect"));

    // 1. まず全ての `<option>` の disabled を解除（リセット）
    selects.forEach(select => {
        Array.from(select.options).forEach(opt => {
            opt.disabled = false;
        });
    });

    // 2. 現在いずれかのセレクトボックスで「実際に選択されている選手」のリストを取得
    const selectedValues = selects
        .map(s => s.value)
        .filter(val => val !== "");

    // 3. 各セレクトボックスに対し、「他のセレクトで選ばれている選手」を disabled に設定
    selects.forEach(currentSelect => {
        const currentValue = currentSelect.value;

        Array.from(currentSelect.options).forEach(opt => {
            if (!opt.value) return; // 「未選択」はスキップ

            // 「選択中の選手リスト」に含まれていて、かつ「自分自身が現在選択している値」ではない場合
            if (selectedValues.includes(opt.value) && opt.value !== currentValue) {
                opt.disabled = true;
            }
        });
    });
}


// =================================
// 試合ノート ポップアップ（ドロワー）制御
// =================================

let drawerOriginalParent = null;
let drawerMovedElement = null;

/**
 * 隠しメニュー（ポップアップ）を開く
 * @param {'lineup' | 'goals' | 'subs'} type 
 */
window.openMatchDrawer = function(type) {
    const drawer = document.getElementById("matchDrawer");
    const overlay = document.getElementById("drawerOverlay");
    const titleEl = document.getElementById("drawerTitle");
    const contentEl = document.getElementById("drawerContent");

    if (!drawer || !overlay || !contentEl) return;

    // 前回の移動要素があれば元の場所に戻す
    if (drawerMovedElement && drawerOriginalParent) {
        drawerOriginalParent.appendChild(drawerMovedElement);
        drawerMovedElement = null;
        drawerOriginalParent = null;
    }

    // ドロワーの中身を一旦クリア
    contentEl.innerHTML = "";

    if (type === 'lineup') {
        titleEl.textContent = "スタメン設定（8名）";
        
        // ★ スクロール画面からスタメンを消したため、動的生成関数を呼ぶ
        if (typeof renderLineupDrawer === "function") {
            renderLineupDrawer(contentEl);
        }

    } else if (type === 'goals') {
        titleEl.textContent = "得点記録";
        
        // 得点入力用ボタンエリアを動的に生成
        const goalBox = document.createElement("div");
        goalBox.className = "drawerGoalContainer";

        const pitchPlayers = getCurrentPitchPlayers();

        // 1. ピッチ上の選手ボタン
        pitchPlayers.forEach(player => {
            const btn = document.createElement("button");
            btn.className = "goalScorerBtn";
            btn.textContent = player + " ⚽";
            btn.onclick = () => {
                goalButtonClick(player);
                closeMatchDrawer();
            };
            goalBox.appendChild(btn);
        });

        // 2. オウンゴール
        const ownBtn = document.createElement("button");
        ownBtn.className = "goalScorerBtn ownGoal";
        ownBtn.textContent = "オウンゴール";
        ownBtn.onclick = () => {
            goalButtonClick("オウンゴール");
            closeMatchDrawer();
        };
        goalBox.appendChild(ownBtn);

        // 3. 相手得点
        const oppBtn = document.createElement("button");
        oppBtn.className = "goalScorerBtn opponentGoal";
        oppBtn.textContent = "相手得点";
        oppBtn.onclick = () => {
            goalButtonClick("相手得点");
            closeMatchDrawer();
        };
        goalBox.appendChild(oppBtn);

        contentEl.appendChild(goalBox);

    } else if (type === 'subs') {
        titleEl.textContent = "選手交代";
        // ★ 動的に交代選択フォーム（OUT:ピッチ上 / IN:ピッチ外）を生成
        renderSubstitutionDrawer(contentEl);
    }
    overlay.classList.add("show");
    drawer.classList.add("show");
};


/**
 * 隠しメニュー（ポップアップ）を閉じる
 */
window.closeMatchDrawer = function() {
    const drawer = document.getElementById("matchDrawer");
    const overlay = document.getElementById("drawerOverlay");

    if (drawer) drawer.classList.remove("show");
    if (overlay) overlay.classList.remove("show");

    // モード切り替え時に要素を元の場所に復元
    if (drawerMovedElement && drawerOriginalParent) {
        drawerOriginalParent.appendChild(drawerMovedElement);
        drawerMovedElement = null;
        drawerOriginalParent = null;
    }
};


/**
 * 現在のピッチ上の選手とベンチ（未出場）選手を取得するヘルパー関数
 */
function getPitchAndBenchPlayers() {
    const matchState = tournament.matches[tournament.currentMatch];
    if (!matchState) return { pitchPlayers: [], benchPlayers: [] };

    // 1. スタメン選手（選択済みのもの）
    let currentPitch = Object.values(matchState.lineup).filter(name => name !== "");

    // 2. 過去の交代処理を順に適用して、現在のピッチ上選手を割り出す
    if (Array.isArray(matchState.substitutions)) {
        matchState.substitutions.forEach(sub => {
            if (sub.done && sub.out && sub.in) {
                currentPitch = currentPitch.filter(p => p !== sub.out);
                if (!currentPitch.includes(sub.in)) {
                    currentPitch.push(sub.in);
                }
            }
        });
    }

    // 3. チーム登録選手（players）のうち、現在ピッチ上にいない選手が「ベンチ選手」
    const teamPlayers = Array.isArray(players) ? players.filter(p => p !== "") : [];
    const benchPlayers = teamPlayers.filter(p => !currentPitch.includes(p));

    return { pitchPlayers: currentPitch, benchPlayers };
}

/**
 * ドロワー内の交代操作画面を動的生成
 */
function renderSubstitutionDrawer(container) {
    const matchState = tournament.matches[tournament.currentMatch];
    if (!matchState) return;

    const { pitchPlayers, benchPlayers } = getPitchAndBenchPlayers();

    const box = document.createElement("div");
    box.className = "drawerSubContainer";

    let outOptions = '<option value="">OUT選手を選択</option>';
    pitchPlayers.forEach(p => {
        outOptions += `<option value="${p}">${p}</option>`;
    });

    let inOptions = '<option value="">IN選手を選択</option>';
    benchPlayers.forEach(p => {
        inOptions += `<option value="${p}">${p}</option>`;
    });

    box.innerHTML = `
        <div class="subSelectGroup">
            <div class="subSelectRow">
                <label class="labelOut">OUT</label>
                <select id="subOutSelect" class="subSelect">${outOptions}</select>
            </div>
            <div class="subSelectRow">
                <label class="labelIn">IN</label>
                <select id="subInSelect" class="subSelect">${inOptions}</select>
            </div>
        </div>
        <button type="button" id="execSubBtn" class="execSubBtn">交代を実行</button>
    `;

    container.innerHTML = "";
    container.appendChild(box);

    // ★ 交代実行ボタンのイベント（修正）
    document.getElementById("execSubBtn").addEventListener("click", () => {
        const outVal = document.getElementById("subOutSelect").value;
        const inVal = document.getElementById("subInSelect").value;

        if (!outVal || !inVal) {
            alert("OUT選手とIN選手の両方を選択してください。");
            return;
        }

        // 現在選択されている試合を安全に参照
        const currentIdx = tournament.currentMatch;
        const currentMatchState = tournament.matches[currentIdx];

        if (!currentMatchState) return;

        if (!Array.isArray(currentMatchState.substitutions)) {
            currentMatchState.substitutions = [];
        }

        // 対象試合の配列にだけデータを追加
        currentMatchState.substitutions.push({
            out: outVal,
            in: inVal,
            done: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // 交代履歴を再描画
        renderSubHistory();

        // ドロワーを閉じる
        closeMatchDrawer();
    });
}

/**
 * メイン画面（スクロール画面）の交代履歴を描画
 */
function renderSubHistory() {
    const subHistoryEl = document.getElementById("subHistory");
    if (!subHistoryEl) return;

    // 現在選択中の試合データを取得
    const currentIdx = tournament.currentMatch;
    const matchState = tournament.matches[currentIdx];

    // ★必ず最初に一度エリアをクリアする
    subHistoryEl.innerHTML = "";

    // データが存在しない、または空の場合は「履歴なし」を表示して終了
    if (!matchState || !Array.isArray(matchState.substitutions) || matchState.substitutions.length === 0) {
        subHistoryEl.innerHTML = '<p class="emptySubText">交代履歴はありません</p>';
        return;
    }

    // 該当試合の交代履歴のみを出力
    let html = '<ul class="subHistoryList">';
    matchState.substitutions.forEach((sub, index) => {
        if (sub.done) {
            html += `
                <li class="subHistoryItem">
                    <span class="subIndex">${index + 1}</span>
                    <span class="subOutName">${sub.out}</span>
                    <span class="subArrow">➜</span>
                    <span class="subInName">${sub.in}</span>
                </li>
            `;
        }
    });
    html += '</ul>';

    subHistoryEl.innerHTML = html;
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
        refreshMatch();
        //createLineup();
        //createSubstitutionArea();
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


    
        // ★ 大会作成ダイアログの表示設定
    document.getElementById("createTournamentButton")?.addEventListener("click", () => {
        const generatedId = generateTournamentId();

        openDialog({
            title: "新しい大会を作成",
            content: `
                <div class="dialogFormGroup">
                    <label for="tournamentName">大会名 <span class="required">*</span></label>
                    <input id="tournamentName" class="dialogInput" placeholder="例: 第10回 市民サッカー大会 (U-10)">
                </div>

                <div class="dialogFormGroup">
                    <label for="tournamentDate">開催日</label>
                    <input id="tournamentDate" type="date" class="dialogInput">
                </div>

                <div class="dialogFormGroup">
                    <label for="tournamentPlace">会場・グラウンド名</label>
                    <input id="tournamentPlace" class="dialogInput" placeholder="例: ○○スポーツ広場 Aコート">
                </div>
             /*   <div class="dialogIdInfo">
                    <span>自動発行ID:</span>
                    <strong id="generatedTournamentId">${generatedId}</strong>
                </div>
                */
            `,
            buttons: [
                {
                    text: "作成",
                    className: "primaryButton",
                    onclick: createTournament
                },
                {
                    text: "キャンセル"
                }
            ]
        });
    });
    
        // ホームチーム選択変更（試合ごとに個別保存）
    document.getElementById("homeTeamSelect")?.addEventListener("change", async function () {
        const id = this.value;
        const matchState = tournament.matches[tournament.currentMatch];

        if (!id) {
            players = [];
            matchState.homeTeam = "";
            matchState.homeTeamId = "";
        } else {
            const snapshot = await getDoc(doc(db, "teams", id));
            if (snapshot.exists()) {
                const team = snapshot.data();
                players = [...(team.players || [])];
                matchState.homeTeam = team.teamName;
                matchState.homeTeamId = id;
            }
        }

        // チーム変更に伴い、スコア表記やメンバー一覧を更新
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
        // 大会情報の入力保持
    document.getElementById("matchName")?.addEventListener("input", (e) => {
        tournament.name = e.target.value;
    });

    document.getElementById("matchPlace")?.addEventListener("input", (e) => {
        tournament.place = e.target.value;
    });

    document.getElementById("matchDate")?.addEventListener("change", (e) => {
        tournament.date = e.target.value;
    });

}
