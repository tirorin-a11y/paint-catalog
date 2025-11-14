// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec"; 
// ------------------

let loadingTimer = null; 

// ★ページが読み込まれたら、すぐにメーカー一覧を取得しに行く
document.addEventListener("DOMContentLoaded", fetchMakerList);

document.getElementById("searchButton").addEventListener("click", searchCatalog);
document.getElementById("catalogSearch").addEventListener("keypress", function(e) {
    if (e.key === "Enter") searchCatalog();
});

// ★メーカーリストを取得してプルダウンを作る関数
function fetchMakerList() {
    fetch(GAS_API_URL + "?type=getMakers")
        .then(response => response.json())
        .then(makers => {
            // 2つのプルダウンに同じリストを入れる
            updateSelect("maker1", makers);
            updateSelect("maker2", makers);
        })
        .catch(error => console.error("メーカー一覧取得エラー:", error));
}

// プルダウンの中身を更新するヘルパー関数
function updateSelect(id, makers) {
    let select = document.getElementById(id);
    select.innerHTML = '<option value="">指定なし</option>'; // リセット
    makers.forEach(maker => {
        let option = document.createElement("option");
        option.value = maker;
        option.innerText = maker;
        select.appendChild(option);
    });
}


function searchCatalog() {
    let keyword = document.getElementById("catalogSearch").value;
    
    // ★選択されたメーカーを取得
    let m1 = document.getElementById("maker1").value;
    let m2 = document.getElementById("maker2").value;
    
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    // キーワードもメーカー指定も無い場合は何もしない
    if (!keyword && !m1 && !m2) return;

    if (loadingTimer) clearInterval(loadingTimer);

    listElement.innerHTML = ""; 
    
    // 演出
    statusMsg.innerText = "🔍 カタログを検索中...";
    let isToggle = false;
    loadingTimer = setInterval(function() {
        statusMsg.innerText = isToggle ? "🔍 カタログを検索中..." : "💦 開発奮闘中..."; 
        isToggle = !isToggle; 
    }, 1000);

    // ★GASに送るデータを作成
    // メーカー指定がある場合、カンマ区切りで送る (例: "エスケー化研,日本ペイント")
    let makerParam = [];
    if (m1) makerParam.push(m1);
    if (m2) makerParam.push(m2);
    
    // URLを作成
    let url = GAS_API_URL + "?q=" + encodeURIComponent(keyword) + "&makers=" + encodeURIComponent(makerParam.join(","));

    fetch(url)
        .then(response => response.json())
        .then(data => {
            clearInterval(loadingTimer);
            loadingTimer = null;
            statusMsg.innerText = ""; 

            if (data.length > 0) {
                data.forEach(function(item) {
                    let li = document.createElement("li");
                    let statusBadge = item.status === "廃盤" ? '<span style="color:red; font-weight:bold; margin-left:5px;">[廃盤]</span>' : '';
                    li.innerHTML = `
                        <div class="result-item" style="padding: 5px 0;">
                            <a href="${item.url}" target="_blank" style="font-weight:bold; font-size:18px; text-decoration:none; color:#007bff;">${item.name}</a>
                            ${statusBadge}
                            <div style="font-size:12px; color:#666; margin-top:2px;">
                                メーカー: ${item.maker} / 下地: ${item.shitaji || "情報なし"}
                            </div>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 5px 0;">
                    `;
                    listElement.appendChild(li);
                });
            } else {
                statusMsg.innerText = "該当するカタログが見つかりません。";
            }
        })
        .catch(error => {
            clearInterval(loadingTimer);
            loadingTimer = null;
            console.error("Error:", error);
            statusMsg.innerText = "エラーが発生しました。";
        });
}


// 見積もりツール（準備中）
document.getElementById("calcButton").addEventListener("click", function() {
    alert("【準備中】\n\n自動見積もり機能は現在開発中です。\n次回のアップデートをお待ちください！");
});