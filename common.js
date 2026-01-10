// ★修正：URLはここは空っぽにしておく（設定画面の入力を優先させるため）
const CONFIG = {
    GAS_API_URL: "", // ←ここは空欄でOK！
    BACKUP_WARN_DAYS: 3
};

// --- 共通ユーティリティ ---

function showNotification(msg) {
    let el = document.getElementById('notification');
    if (!el) {
        el = document.createElement('div');
        el.id = 'notification';
        el.className = 'notification';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
}

// (toggleModal, window.onpopstate, checkBackupStatus, touchBackupTime はそのまま)
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    if (!modal || !overlay) return;
    if (show) {
        modal.classList.add('show');
        overlay.classList.add('show');
        history.pushState({ modalId: modalId }, null, "");
    } else {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        if (history.state && history.state.modalId === modalId) { history.back(); }
    }
}

window.onpopstate = function(event) {
    document.querySelectorAll('.modal-box.show').forEach(el => el.classList.remove('show'));
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.remove('show');
};

function checkBackupStatus() {
    const lastBackup = localStorage.getItem('dx_last_backup');
    if (!lastBackup) return; 
    const days = (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
    if (days > CONFIG.BACKUP_WARN_DAYS) {
        setTimeout(() => showNotification(`⚠️ バックアップから${Math.floor(days)}日経過`), 2000);
    }
}

function touchBackupTime() { localStorage.setItem('dx_last_backup', Date.now()); }

// ★★★ ここを修正：設定画面のURLを必ず使うように変更 ★★★
async function uploadDataToCloud(data, type = "sync") {
    // 毎回、その瞬間に設定画面（localStorage）に入っているURLを取りに行く
    const targetUrl = localStorage.getItem('dx_gas_url');

    if(!targetUrl || targetUrl.includes("script.google.com") === false) {
        alert("【エラー】\n設定画面（⚙️）から、正しいGAS URLを登録してください。");
        return false;
    }
    
    // データ同期の場合のみ、競合チェック
    if (type === "sync") {
        showNotification("☁️ クラウド確認中...");
        try {
            const checkRes = await fetch(targetUrl + "?type=getAll");
            const cloudData = await checkRes.json();
            
            const localMax = data.length > 0 ? Math.max(...data.map(s => s.updatedAt || 0)) : 0;
            const cloudMax = Array.isArray(cloudData) && cloudData.length > 0 ? Math.max(...cloudData.map(s => s.updatedAt || 0)) : 0;

            if (cloudMax > localMax) {
                const cloudDate = new Date(cloudMax).toLocaleString();
                if (navigator.vibrate) navigator.vibrate(200);
                
                if (!confirm(`⚠️ 上書き注意！\nクラウドに新しいデータがあります（${cloudDate}）。\n\n強制的に上書きしますか？\n（キャンセルすると中止します）`)) {
                    showNotification("送信を中断しました");
                    return false;
                }
            }
        } catch(e) {
            console.warn("競合チェック失敗:", e);
        }
    }
    
    // 送信処理
    try {
        showNotification("☁️ 送信中...");
        // ここでも targetUrl を使う
        await fetch(targetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, data: data, reporter: localStorage.getItem('dx_reporter_name') || "職人" })
        });
        showNotification("✅ 送信完了");
        touchBackupTime();
        return true;
    } catch(e) {
        alert("送信エラー: " + e);
        return false;
    }
}

// ★追加：起動時のチェック用も修正
async function checkForCloudUpdates() {
    const targetUrl = localStorage.getItem('dx_gas_url');
    if(!targetUrl) return;

    const sites = JSON.parse(localStorage.getItem('dx_sites')) || [];
    const localMax = sites.length > 0 ? Math.max(...sites.map(s => s.updatedAt || 0)) : 0;

    try {
        const res = await fetch(targetUrl + "?type=getAll");
        const cloudData = await res.json();
        if (Array.isArray(cloudData) && cloudData.length > 0) {
            const cloudMax = Math.max(...cloudData.map(s => s.updatedAt || 0));
            if (cloudMax > localMax) {
                if (confirm(`🔄 新しいデータがあります！\n同期して最新にしますか？`)) {
                    cloudData.sort((a, b) => (a.id > b.id ? -1 : 1));
                    localStorage.setItem('dx_sites', JSON.stringify(cloudData));
                    alert("✅ 最新データを取り込みました！");
                    location.reload();
                }
            }
        }
    } catch (e) {
        console.log("更新チェック失敗:", e);
    }
}