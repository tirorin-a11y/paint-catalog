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
    
    // ▼ 絞り込みの値を取得
    let m1 = document.getElementById("maker1").value;
    let m2 = document.getElementById("maker2").value;
    let filterJ = document.getElementById("filter_j").value;
    let filterK = document.getElementById("filter_k").value;
    let filterL = document.getElementById("filter_l").value;
    let filterM = document.getElementById("filter_m").value;
    
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    // 何も入力されていなければ何もしない
    if (!keyword && !m1 && !m2 && !filterJ && !filterK && !filterL && !filterM) return;

    if (loadingTimer) clearInterval(loadingTimer);

    listElement.innerHTML = ""; 
    
    // 演出
    statusMsg.innerText = "🔍 カタログを検索中...";
    let isToggle = false;
    loadingTimer = setInterval(function() {
        statusMsg.innerText = isToggle ? "🔍 カタログを検索中..." : "💦 開発奮闘中..."; 
        isToggle = !isToggle; 
    }, 1000);

    // GASに送るURLを組み立てる
    let params = new URLSearchParams();
    params.append("q", keyword);
    params.append("makers", [m1, m2].filter(Boolean).join(",")); // 空でなければ結合
    params.append("j", filterJ);
    params.append("k", filterK);
    params.append("l", filterL);
    params.append("m", filterM);

    let url = GAS_API_URL + "?" + params.toString();

    fetch(url)
        .then(response => response.json())
        .then(data => {
            clearInterval(loadingTimer);
            loadingTimer = null;
            statusMsg.innerText = ""; 

            if (data.length > 0) {
                // ▼ ここから結果表示のHTML組み立て ▼
                data.forEach(function(item) {
                    let li = document.createElement("li");
                    let statusBadge = item.status === "廃盤" ? `<span class="badge-stop">[廃盤]</span>` : '';
                    
                    // --- ▼ [PDF]リンクを作成（D列） ▼ ---
                    let pdfLinkHTML = "";
                    if (item.pdf_url) {
                        pdfLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link pdf-link"> [PDF] </a>`;
                    }

                    // --- ▼ 品名リンクを作成（C列 or なければPDF） ▼ ---
                    let mainLinkHTML = "";
                    if (item.url) { // C列(製品ページ)がある場合
                        mainLinkHTML = `<a href="${item.url}" target="_blank" class="result-link product-link">${item.name}</a>`;
                    } else if (item.pdf_url) { // C列がなくD列(PDF)がある場合
                        // 品名が押せないのは不便なので、PDFにリンクしておく
                        mainLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link product-link">${item.name}</a>`;
                    } else { // どっちも無い場合
                        mainLinkHTML = `<span class="result-link no-link">${item.name}</span>`;
                    }
                    
                    // --- ▼ HTMLを組み立て ▼ ---
                    li.innerHTML = `
                        <div class="result-item">
                            ${mainLinkHTML}
                            ${pdfLinkHTML}
                            ${statusBadge}
                        </div>
                        <div class="result-meta">
                            <span class="maker-name">メーカー: ${item.maker}</span>
                            <span class="shitaji-info"> / 下地: ${item.shitaji || "情報なし"}</span>
                        </div>
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