// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec"; 
const UNLOCK_COUNT = 20; // 応援ボタンの回数
// ------------------

let loadingTimer = null; // 演出用タイマー
let debounceTimer = null; // ライブ検索用のタイマー

// --- ▼ サイト初期化 ▼ ---
document.addEventListener("DOMContentLoaded", function() {
    runUpdate(); // ★初回実行（全リストを取得）
    initializeCheerButton(); 
    initializePwaBanner(); 
    initializeEstimateButton(); // 見積もりボタンのリスナー
});

// --- ▼ イベントリスナー（ライブ検索） ▼ ---
document.getElementById("catalogSearch").addEventListener("change", runUpdate);
document.getElementById("catalogSearch").addEventListener("keypress", function(e) {
    if (e.key === "Enter") { runUpdate(); }
});
// ★修正：maker2を削除
document.getElementById("maker1").addEventListener("change", runUpdate);
document.getElementById("filter_j").addEventListener("change", runUpdate);
document.getElementById("filter_k").addEventListener("change", runUpdate);
document.getElementById("filter_l").addEventListener("change", runUpdate);
document.getElementById("filter_m").addEventListener("change", runUpdate);


/**
 * メインの検索＆更新関数（V3.1）
 */
function runUpdate() {
    let keyword = document.getElementById("catalogSearch").value;
    let maker = document.getElementById("maker1").value; // ★修正：maker1だけ取得
    let filterJ = document.getElementById("filter_j").value, filterK = document.getElementById("filter_k").value, filterL = document.getElementById("filter_l").value, filterM = document.getElementById("filter_m").value;
    
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    if (!keyword && !maker && !filterJ && !filterK && !filterL && !filterM) {
        listElement.innerHTML = ""; statusMsg.innerText = "";
        if (loadingTimer) clearInterval(loadingTimer);
        // ★修正：初回ロード時も「全リスト」ではなく「0件」で開始する
        if (document.getElementById("maker1").length <= 2) { 
             // 何も入力せず、全リストを取得しに行く
        } else {
            return; 
        }
    }
    if (loadingTimer) clearInterval(loadingTimer);
    listElement.innerHTML = ""; 
    
    statusMsg.innerText = "🔍 カタログを検索中...";
    statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
    
    let isToggle = false;
    loadingTimer = setInterval(function() {
        statusMsg.innerText = isToggle ? "🔍 カタログを検索中..." : "💦 開発奮闘中..."; 
        isToggle = !isToggle; 
    }, 1000);

    let params = new URLSearchParams();
    params.append("q", keyword);
    params.append("maker", maker); // ★修正：makers → maker
    params.append("j", filterJ); params.append("k", filterK); params.append("l", filterL); params.append("m", filterM);
    let url = GAS_API_URL + "?" + params.toString();

    fetch(url)
        .then(response => response.json())
        .then(data => {
            clearInterval(loadingTimer); loadingTimer = null; statusMsg.innerText = ""; 

            // 4. (神機能) プルダウンの選択肢を更新する
            updateAllDropdowns(data.availableFilters);
            
            // 5. 検索結果を表示する
            if (data.results.length > 0) {
                data.results.forEach(function(item) {
                    let li = document.createElement("li");
                    let statusBadge = item.status === "廃盤" ? `<span class="badge-stop">[廃盤]</span>` : '';
                    let pdfLinkHTML = item.pdf_url ? `<a href="${item.pdf_url}" target="_blank" class="result-link pdf-link"> [PDF] </a>` : "";
                    let mainLinkHTML = "";
                    if (item.url) { mainLinkHTML = `<a href="${item.url}" target="_blank" class="result-link product-link">${item.name}</a>`; }
                    else if (item.pdf_url) { mainLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link product-link">${item.name}</a>`; }
                    else { mainLinkHTML = `<span class="result-link no-link">${item.name}</span>`; }
                    li.innerHTML = `
                        <div class="result-item">${mainLinkHTML}${pdfLinkHTML}${statusBadge}</div>
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
            clearInterval(loadingTimer); loadingTimer = null; console.error("Error:", error);
            statusMsg.innerText = "エラーが発生しました。";
        });
}

/**
 * ★(神機能) GASから返ってきたリストで、全プルダウンを更新する (V3.1)
 */
function updateAllDropdowns(filters) {
    let m1_val = document.getElementById("maker1").value;
    let j_val = document.getElementById("filter_j").value;
    let k_val = document.getElementById("filter_k").value;
    let l_val = document.getElementById("filter_l").value;
    let m_val = document.getElementById("filter_m").value;

    updateSelect("maker1", filters.makers, "指定なし（全社検索）", m1_val);
    // ★修正：maker2を削除
    updateSelect("filter_j", filters.j, "指定なし", j_val);
    updateSelect("filter_k", filters.k, "指定なし", k_val);
    updateSelect("filter_l", filters.l, "指定なし", l_val);
    updateSelect("filter_m", filters.m, "指定なし", m_val);
}

/**
 * プルダウンの中身を動的に生成するヘルパー関数 (改良版)
 */
function updateSelect(id, list, defaultOptionText, currentValue) {
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
        if (item === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    if (currentValue && !list.includes(currentValue)) {
        select.value = "";
    }
}

// --- ▼ 見積もりツール（準備中） ▼ ---
function initializeEstimateButton() {
    document.getElementById("calcButton").addEventListener("click", function() {
        alert("【準備中】\n\n自動見積もり機能は現在開発中です。\n次回のアップデートをお待ちください！");
    });
}

// --- ▼ 応援ボタン制御スクリプト ▼ ---
function initializeCheerButton() {
    let count = localStorage.getItem("cheerCount") ? parseInt(localStorage.getItem("cheerCount")) : 0;
    let isUnlocked = localStorage.getItem("contactFormUnlocked") === "true";
    const cheerCountDisplay = document.getElementById("cheerCount");
    const unlockMessage = document.getElementById("unlockMessage");
    const contactForm = document.getElementById("hiddenContactForm");

    if (!cheerCountDisplay || !unlockMessage || !contactForm) return;

    cheerCountDisplay.innerText = count + " いいね！";
    if (isUnlocked) {
        contactForm.style.display = "block";
        unlockMessage.innerText = "いつも応援ありがとうございます！";
    } else {
        let remaining = UNLOCK_COUNT - count;
        if(remaining <= 0) remaining = 1; 
        unlockMessage.innerText = "お問い合わせフォーム解放まで あと " + remaining + " 回";
    }

    document.getElementById("cheerButton").addEventListener("click", function() {
        count++; 
        cheerCountDisplay.innerText = count + " いいね！";
        localStorage.setItem("cheerCount", count);
        if (isUnlocked) return;
        if (count >= UNLOCK_COUNT) {
            alert("🎉 " + UNLOCK_COUNT + "回達成！\nありがとうございます！お問い合わせフォームを解放します！");
            contactForm.style.display = "block";
            unlockMessage.innerText = "いつも応援ありがとうございます！";
            localStorage.setItem("contactFormUnlocked", "true");
            isUnlocked = true;
        } else {
            let remaining = UNLOCK_COUNT - count;
            unlockMessage.innerText = "お問い合わせフォーム解放まで あと " + remaining + " 回";
        }
    });
}

// --- ▼ PWAバナー制御スクリプト ▼ ---
function initializePwaBanner() {
    const banner = document.getElementById("pwa-install-banner");
    const closeBtn = document.getElementById("pwa-close-btn");

    if (!banner || !closeBtn) return; 

    const isDismissed = localStorage.getItem("pwaBannerDismissed") === "true";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isDismissed || !isMobile) { return; }
    
    banner.style.display = "flex";

    closeBtn.addEventListener("click", function() {
        banner.style.display = "none";
        localStorage.setItem("pwaBannerDismissed", "true");
    });
}