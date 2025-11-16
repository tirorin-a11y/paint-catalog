// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec"; 
// ------------------

let loadingTimer = null; // 演出用タイマー
let debounceTimer = null; // ★ライブ検索用のタイマー

// --- ▼ サイト初期化（変更） ▼ ---
// ページ読み込み時に、プルダウンのリストをGASから取得
document.addEventListener("DOMContentLoaded", fetchInitialData);

// --- ▼ イベントリスナー（ここがライブ検索の心臓部） ▼ ---

// 1. テキスト検索窓（入力後、500ミリ秒待ってから検索）
document.getElementById("catalogSearch").addEventListener("input", function() {
    clearTimeout(debounceTimer); // 前のタイマーをキャンセル
    debounceTimer = setTimeout(function() {
        searchCatalog(); // 500ミリ秒間、次の入力がなければ検索実行
    }, 500);
});

// 2. 検索ボタン（これは即時実行）
document.getElementById("searchButton").addEventListener("click", searchCatalog);

// 3. 全てのプルダウン（変更されたら即時実行）
document.getElementById("maker1").addEventListener("change", searchCatalog);
document.getElementById("maker2").addEventListener("change", searchCatalog);
document.getElementById("filter_j").addEventListener("change", searchCatalog);
document.getElementById("filter_k").addEventListener("change", searchCatalog);
document.getElementById("filter_l").addEventListener("change", searchCatalog);
document.getElementById("filter_m").addEventListener("change", searchCatalog);


/**
 * サイト初期化：GASから全リストを取得し、プルダウンを生成する
 */
function fetchInitialData() {
    fetch(GAS_API_URL + "?type=getInitialData")
        .then(response => response.json())
        .then(data => {
            updateSelect("maker1", data.makers, "指定なし（全社検索）");
            updateSelect("maker2", data.makers, "指定なし");
            updateSelect("filter_j", data.filters.j, "指定なし");
            updateSelect("filter_k", data.filters.k, "指定なし");
            updateSelect("filter_l", data.filters.l, "指定なし");
            updateSelect("filter_m", data.filters.m, "指定なし");
        })
        .catch(error => console.error("初期データ取得エラー:", error));
}

/**
 * プルダウンの中身を動的に生成するヘルパー関数
 */
function updateSelect(id, list, defaultOptionText) {
    let select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '';
    let defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = defaultOptionText;
    select.appendChild(defaultOption);
    list.forEach(item => {
        let option = document.createElement("option");
        option.value = item;
        option.innerText = item;
        select.appendChild(option);
    });
}

/**
 * メインの検索実行関数
 */
function searchCatalog() {
    // 全てのフォームから現在の値を取得
    let keyword = document.getElementById("catalogSearch").value;
    let m1 = document.getElementById("maker1").value;
    let m2 = document.getElementById("maker2").value;
    let filterJ = document.getElementById("filter_j").value;
    let filterK = document.getElementById("filter_k").value;
    let filterL = document.getElementById("filter_l").value;
    let filterM = document.getElementById("filter_m").value;
    
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    // 全ての入力が空なら、検索を実行しない（リストを空にするだけ）
    if (!keyword && !m1 && !m2 && !filterJ && !filterK && !filterL && !filterM) {
        listElement.innerHTML = ""; // リストをクリア
        statusMsg.innerText = ""; // メッセージをクリア
        if (loadingTimer) clearInterval(loadingTimer); // 演出も止める
        return;
    }

    if (loadingTimer) clearInterval(loadingTimer);
    listElement.innerHTML = ""; 
    
    // 演出＆自動スクロール
    statusMsg.innerText = "🔍 カタログを検索中...";
    statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' }); // ★自動スクロール
    
    let isToggle = false;
    loadingTimer = setInterval(function() {
        statusMsg.innerText = isToggle ? "🔍 カタログを検索中..." : "💦 開発奮闘中..."; 
        isToggle = !isToggle; 
    }, 1000);

    // GASに送るURLを組み立てる
    let params = new URLSearchParams();
    params.append("q", keyword);
    params.append("makers", [m1, m2].filter(Boolean).join(","));
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
                // (結果表示のHTML組み立ては変更なし)
                data.forEach(function(item) {
                    let li = document.createElement("li");
                    let statusBadge = item.status === "廃盤" ? `<span class.badge-stop">[廃盤]</span>` : '';
                    let pdfLinkHTML = "";
                    if (item.pdf_url) {
                        pdfLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link pdf-link"> [PDF] </a>`;
                    }
                    let mainLinkHTML = "";
                    if (item.url) { 
                        mainLinkHTML = `<a href="${item.url}" target="_blank" class="result-link product-link">${item.name}</a>`;
                    } else if (item.pdf_url) { 
                        mainLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link product-link">${item.name}</a>`;
                    } else { 
                        mainLinkHTML = `<span class="result-link no-link">${item.name}</span>`;
                    }
                    
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