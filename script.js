// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec"; 
const UNLOCK_COUNT = 20; 
// ------------------

let loadingTimer = null; 
let debounceTimer = null; 
let allMakersList = []; 

document.addEventListener("DOMContentLoaded", function() {
    fetchInitialData(); 
    initializeCheerButton(); 
    initializeEstimateButton(); 
    initializeHintPopup(); 
});

document.getElementById("catalogSearch").addEventListener("change", function() { runUpdate(false); }); 
document.getElementById("catalogSearch").addEventListener("keypress", function(e) {
    if (e.key === "Enter") { runUpdate(false); }
});
document.getElementById("maker1").addEventListener("change", function() { runUpdate(false); }); 
document.getElementById("filter_j").addEventListener("change", function() { runUpdate(false); }); 
document.getElementById("filter_k").addEventListener("change", function() { runUpdate(false); }); 
document.getElementById("filter_l").addEventListener("change", function() { runUpdate(false); }); 
document.getElementById("filter_m").addEventListener("change", function() { runUpdate(false); }); 


function fetchInitialData() {
    let url = GAS_API_URL + "?type=getInitialData";

    fetch(url)
        .then(response => response.json())
        .then(data => {
            allMakersList = data.makers; 
            
            // ★★★ 修正点：ここが抜けていました！ ★★★
            // GASから来た「フィルター」に「メーカー」も合体させてから渡す
            let initialFilters = data.filters;
            initialFilters.makers = data.makers; 
            // ★★★★★★★★★★★★★★★★★★★★★★★

            updateAllDropdowns(initialFilters, true);
            generateHintTags(data.keywords); 

            setTimeout(function() {
                const searchBox = document.getElementById("catalogSearch");
                if (searchBox) {
                    searchBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 1000); 
        })
        .catch(error => console.error("初期データ取得エラー:", error));
}

function generateHintTags(keywords) {
    const container = document.getElementById("hintTagContainer");
    if (!container) return;
    
    container.innerHTML = ""; 
    if (!keywords || keywords.length === 0) {
        container.innerHTML = '<span style="font-size:12px; color:#999;">キーワードがまだ登録されていません (H列)</span>';
        return;
    }
    keywords.forEach(word => {
        let tag = document.createElement("button");
        tag.innerText = word;
        tag.style.cssText = "font-size:12px; padding:5px 10px; background:#f0f8ff; border:1px solid #add8e6; border-radius:15px; color:#007bff; cursor:pointer; margin-right:5px; margin-bottom:5px;";
        tag.addEventListener("click", function() {
            let searchBox = document.getElementById("catalogSearch");
            searchBox.value = word; 
            document.getElementById("hintPopup").style.display = "none"; 
            runUpdate(false); 
        });
        container.appendChild(tag);
    });
}

function runUpdate(isInitialLoad = false) { 
    let keyword = document.getElementById("catalogSearch").value;
    let maker = document.getElementById("maker1").value; 
    let filterJ = document.getElementById("filter_j").value, filterK = document.getElementById("filter_k").value, filterL = document.getElementById("filter_l").value, filterM = document.getElementById("filter_m").value;
    let listElement = document.getElementById("catalogList");
    let statusMsg = document.getElementById("searchStatus");

    if (!keyword && !maker && !filterJ && !filterK && !filterL && !filterM) {
        listElement.innerHTML = ""; statusMsg.innerText = "";
        if (loadingTimer) clearInterval(loadingTimer);
        if (document.getElementById("maker1").length <= 2 || isInitialLoad) { 
             fetchInitialData(); 
        } else { return; }
        return; 
    }
    if (loadingTimer) clearInterval(loadingTimer);
    listElement.innerHTML = ""; 
    
    statusMsg.innerText = "🔍 カタログを検索中...";
    if (!isInitialLoad) {
        setTimeout(function() { statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 370); 
    }
    
    let isToggle = false;
    loadingTimer = setInterval(function() {
        statusMsg.innerText = isToggle ? "🔍 カタログを検索中..." : "💦 開発奮闘中..."; 
        isToggle = !isToggle; 
    }, 1000);

    let params = new URLSearchParams();
    params.append("q", keyword);
    params.append("maker", maker); 
    params.append("j", filterJ); params.append("k", filterK); params.append("l", filterL); params.append("m", filterM);
    let url = GAS_API_URL + "?" + params.toString();

    fetch(url)
        .then(response => response.json())
        .then(data => {
            clearInterval(loadingTimer); loadingTimer = null; statusMsg.innerText = ""; 
            updateAllDropdowns(data.availableFilters, false); 
            
            if (data.results.length > 0) {
                data.results.forEach(function(item) {
                    let li = document.createElement("li");
                    let statusBadge = item.status === "廃盤" ? `<span class="badge-stop">[廃盤]</span>` : '';
                    let pdfLinkHTML = item.pdf_url ? `<a href="${item.pdf_url}" target="_blank" class="result-link pdf-link"> [PDF] </a>` : "";
                    let mainLinkHTML = "";
                    if (item.url) { mainLinkHTML = `<a href="${item.url}" target="_blank" class="result-link product-link">${item.name}</a>`; }
                    else if (item.pdf_url) { mainLinkHTML = `<a href="${item.pdf_url}" target="_blank" class="result-link product-link">${item.name}</a>`; }
                    else { mainLinkHTML = `<span class="result-link no-link">${item.name}</span>`; }

                    let metaInfo = "";
                    if (item.general) {
                        metaInfo += `<div style="font-size:12px; color:#444; margin-top:4px;">📝 ${item.general}</div>`;
                    } else {
                        metaInfo += `<div style="font-size:12px; color:#888; margin-top:4px;">(下地: ${item.shitaji || "-"})</div>`;
                    }
                    
                    if (item.keyword) {
                        metaInfo += `<div style="margin-top:4px;"><span style="font-size:11px; background:#f0f8ff; color:#007bff; padding:1px 5px; border-radius:3px;">🏷️ ${item.keyword}</span></div>`;
                    }

                    li.innerHTML = `
                        <div class="item-main">${mainLinkHTML}${pdfLinkHTML}${statusBadge}</div>
                        ${metaInfo}
                        <div class="item-meta" style="font-size:11px; color:#999; margin-top:2px; text-align:right;">
                            メーカー: ${item.maker}
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

function updateAllDropdowns(filters, isInitialLoad) {
    if (!filters) return; 
    let makerListSource = isInitialLoad ? filters.makers : allMakersList;
    if (isInitialLoad && filters.makers) { allMakersList = filters.makers; }
    let m1_val = document.getElementById("maker1").value;
    let j_val = document.getElementById("filter_j").value;
    let k_val = document.getElementById("filter_k").value;
    let l_val = document.getElementById("filter_l").value;
    let m_val = document.getElementById("filter_m").value;
    updateSelect("maker1", makerListSource, "指定なし（全社検索）", m1_val);
    updateSelect("filter_j", filters.j, "指定なし", j_val);
    updateSelect("filter_k", filters.k, "指定なし", k_val);
    updateSelect("filter_l", filters.l, "指定なし", l_val);
    updateSelect("filter_m", filters.m, "指定なし", m_val);
}

function updateSelect(id, list, defaultOptionText, currentValue) {
    let select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = ''; 
    let defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = defaultOptionText;
    select.appendChild(defaultOption);
    if (list) { 
      list.forEach(item => {
          let option = document.createElement("option");
          option.value = item;
          option.innerText = item;
          if (item === currentValue) { option.selected = true; }
          select.appendChild(option);
      });
    }
    if (currentValue && list && !list.includes(currentValue)) { select.value = ""; }
}

function initializeHintPopup() {
    const hintBtn = document.getElementById("hintButton");
    const hintPopup = document.getElementById("hintPopup");
    const closeHint = document.getElementById("closeHint");
    if(hintBtn && hintPopup && closeHint) {
        hintBtn.addEventListener("click", () => { hintPopup.style.display = "block"; });
        closeHint.addEventListener("click", () => { hintPopup.style.display = "none"; });
        hintPopup.addEventListener("click", (e) => { if(e.target === hintPopup) hintPopup.style.display = "none"; });
    }
}

function initializeEstimateButton() { let calcButton = document.getElementById("calcButton"); if(calcButton) { calcButton.addEventListener("click", function() { alert("【準備中】\n\n自動見積もり機能は現在開発中です。\n次回のアップデートをお待ちください！"); }); }}
function initializeCheerButton() { let count = localStorage.getItem("cheerCount") ? parseInt(localStorage.getItem("cheerCount")) : 0; let isUnlocked = localStorage.getItem("contactFormUnlocked") === "true"; const cheerCountDisplay = document.getElementById("cheerCount"); const unlockMessage = document.getElementById("unlockMessage"); const contactForm = document.getElementById("hiddenContactForm"); const cheerButton = document.getElementById("cheerButton"); if (!cheerCountDisplay || !unlockMessage || !contactForm || !cheerButton) return; cheerCountDisplay.innerText = count + " いいね！"; if (isUnlocked) { contactForm.style.display = "block"; unlockMessage.innerText = "いつも応援ありがとうございます！"; } else { let remaining = UNLOCK_COUNT - count; if(remaining <= 0) remaining = 1; unlockMessage.innerText = "お問い合わせフォーム解放まで あと " + remaining + " 回"; } cheerButton.addEventListener("click", function() { count++; cheerCountDisplay.innerText = count + " いいね！"; localStorage.setItem("cheerCount", count); if (isUnlocked) return; if (count >= UNLOCK_COUNT) { alert("🎉 " + UNLOCK_COUNT + "回達成！\nありがとうございます！お問い合わせフォームを解放します！"); contactForm.style.display = "block"; unlockMessage.innerText = "いつも応援ありがとうございます！"; localStorage.setItem("contactFormUnlocked", "true"); isUnlocked = true; } else { let remaining = UNLOCK_COUNT - count; unlockMessage.innerText = "お問い合わせフォーム解放まで あと " + remaining + " 回"; } }); }