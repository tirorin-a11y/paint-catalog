// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec"; 
const UNLOCK_COUNT = 20; 
// ------------------

let loadingTimer = null; 
let debounceTimer = null; 

// --- ▼ サイト初期化 ▼ ---
document.addEventListener("DOMContentLoaded", function() {
    runUpdate(); // ★初回実行（全リストを取得）
    initializeCheerButton(); 
    initializePwaBanner(); 
});

// --- ▼ イベントリスナー（修正版：確定時に検索） ▼ ---

// 1. テキスト検索窓（入力が完了してフォーカスが外れた時）
document.getElementById("catalogSearch").addEventListener("change", runUpdate);

// 2. テキスト検索窓（Enterキーが押された時）
document.getElementById("catalogSearch").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        runUpdate(); // 検索実行
    }
});

// 3. 全てのプルダウン（変更されたら即時実行）
document.getElementById("maker1").addEventListener("change", runUpdate);
document.getElementById("maker2").addEventListener("change", runUpdate);
document.getElementById("filter_j").addEventListener("change", runUpdate);
document.getElementById("filter_k").addEventListener("change", runUpdate);
document.getElementById("filter_l").addEventListener("change", runUpdate);
document.getElementById("filter_m").addEventListener("change", runUpdate);

/**
 * メインの検索＆更新関数（V3）
 */
function runUpdate() {
    // 1. 全てのフォームから現在の値を取得
    let keyword = document.getElementById("catalogSearch").value;
    let m1 = document.getElementById("maker1").value, m2 = document.getElementById("maker2").value;
    let filterJ = document.getElementById("filter_j").value, filterK = document.getElementById("filter_k").value, filterL = document.getElementById("filter_l").value, filterM = document.getElementById("filter_m").value;
    
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    // 全ての入力が空なら、リストをクリアして終了
    if (!keyword && !m1 && !m2 && !filterJ && !filterK && !filterL && !filterM) {
        listElement.innerHTML = ""; statusMsg.innerText = "";
        if (loadingTimer) clearInterval(loadingTimer);
        // ★ただし、初回起動時のために、全リスト取得は行う
        if (document.getElementById("maker1").length <= 2) { // "指定なし"と"読込中"しかない場合
             // 何も入力せず、全リストを取得しに行く
        } else {
            return; // ユーザーがリセットした場合はここで終了
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

    // 2. GASに送るURLを組み立てる
    let params = new URLSearchParams();
    params.append("q", keyword);
    params.append("makers", [m1, m2].filter(Boolean).join(","));
    params.append("j", filterJ); params.append("k", filterK); params.append("l", filterL); params.append("m", filterM);
    let url = GAS_API_URL + "?" + params.toString();

    // 3. GASに問い合わせ
    fetch(url)
        .then(response => response.json())
        .then(data => {
            clearInterval(loadingTimer); loadingTimer = null; statusMsg.innerText = ""; 

            // ★ 4. (神機能) プルダウンの選択肢を更新する
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
 * ★(神機能) GASから返ってきたリストで、全プルダウンを更新する
 */
function updateAllDropdowns(filters) {
    // ユーザーが今選んでいる値を保持
    let m1_val = document.getElementById("maker1").value;
    let m2_val = document.getElementById("maker2").value;
    let j_val = document.getElementById("filter_j").value;
    let k_val = document.getElementById("filter_k").value;
    let l_val = document.getElementById("filter_l").value;
    let m_val = document.getElementById("filter_m").value;

    // プルダウンを再構築
    updateSelect("maker1", filters.makers, "指定なし（全社検索）", m1_val);
    updateSelect("maker2", filters.makers, "指定なし", m2_val);
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
    
    select.innerHTML = ''; // 中身をリセット
    
    let defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = defaultOptionText;
    select.appendChild(defaultOption);

    // リストから選択肢を生成
    list.forEach(item => {
        let option = document.createElement("option");
        option.value = item;
        option.innerText = item;
        // もし今選んでいる値と同じなら、選択状態にする
        if (item === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // もし今選んでいる値が、新しいリストに無い場合（=0件になる原因）
    // "指定なし"を選び直す
    if (currentValue && !list.includes(currentValue)) {
        select.value = "";
    }
}

// --- ▼ 見積もりツール（準備中） ▼ ---
document.getElementById("calcButton").addEventListener("click", function() {
    alert("【準備中】\n\n自動見積もり機能は現在開発中です。\n次回のアップデートをお待ちください！");
});


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