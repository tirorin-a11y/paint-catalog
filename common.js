// ★設定：ここにGASのURLを貼れば全ページに適用されます！
const CONFIG = {
    GAS_API_URL: "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec", // ←ここにURLを入れる
    BACKUP_WARN_DAYS: 3 // 何日バックアップしなかったら警告するか
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
        if (history.state && history.state.modalId === modalId) {
            history.back();
        }
    }
}

window.onpopstate = function(event) {
    document.querySelectorAll('.modal-box.show').forEach(el => {
        el.classList.remove('show');
    });
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.remove('show');
};

function checkBackupStatus() {
    const lastBackup = localStorage.getItem('dx_last_backup');
    if (!lastBackup) return; 
    const days = (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
    if (days > CONFIG.BACKUP_WARN_DAYS) {
        setTimeout(() => {
            showNotification(`⚠️ バックアップから${Math.floor(days)}日経過しています`);
        }, 2000);
    }
}

function touchBackupTime() {
    localStorage.setItem('dx_last_backup', Date.now());
}

// ★ここが重要：安全装置付きアップロード機能
async function uploadDataToCloud(data, type = "sync") {
    if(!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.includes("xxxx")) {
        alert("設定からGAS URLを登録してください");
        return false;
    }
    
    // データ同期の場合のみ、競合チェックを行う
    if (type === "sync") {
        showNotification("☁️ クラウドの最新状況を確認中...");
        try {
            // 1. まずクラウドのデータをこっそり見る
            const checkRes = await fetch(CONFIG.GAS_API_URL + "?type=getAll");
            const cloudData = await checkRes.json();
            
            // 2. 日付を比較（空データの場合は0扱い）
            const localMax = data.length > 0 ? Math.max(...data.map(s => s.updatedAt || 0)) : 0;
            const cloudMax = Array.isArray(cloudData) && cloudData.length > 0 ? Math.max(...cloudData.map(s => s.updatedAt || 0)) : 0;

            // 3. クラウドの方が新しければ警告！
            if (cloudMax > localMax) {
                const cloudDate = new Date(cloudMax).toLocaleString();
                // 警告音（バイブレーション）
                if (navigator.vibrate) navigator.vibrate(200);
                
                if (!confirm(`⚠️ 危険！上書き注意 ⚠️\n\nクラウド上に、あなたより新しいデータがあります。\n（最終更新: ${cloudDate}）\n\nこのまま送信すると、他人の変更を消してしまう可能性があります。\n\n「キャンセル」して「クラウドから復元」することをお勧めします。\n\nそれでも上書きしますか？`)) {
                    showNotification("送信を中断しました");
                    return false;
                }
            }
        } catch(e) {
            console.warn("競合チェック失敗（初回送信時などは無視）", e);
        }
    }
    
    // 送信処理
    try {
        showNotification("☁️ 送信中...");
        const res = await fetch(CONFIG.GAS_API_URL, {
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


// ★追加：起動時にクラウドの更新があるかチェックする
async function checkForCloudUpdates() {
    if(!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.includes("xxxx")) return;

    // ローカルデータの最終更新日時を取得
    const sites = JSON.parse(localStorage.getItem('dx_sites')) || [];
    const localMax = sites.length > 0 ? Math.max(...sites.map(s => s.updatedAt || 0)) : 0;

    try {
        // 裏でそっとクラウドのデータを見に行く
        const res = await fetch(CONFIG.GAS_API_URL + "?type=getAll");
        const cloudData = await res.json();

        if (Array.isArray(cloudData) && cloudData.length > 0) {
            const cloudMax = Math.max(...cloudData.map(s => s.updatedAt || 0));

            // クラウドの方が新しければ、ユーザーに提案する
            if (cloudMax > localMax) {
                const dateStr = new Date(cloudMax).toLocaleString();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // ブブッ！と通知

                // ここで確認！勝手には上書きしない
                if (confirm(`🔄 新しいデータがあります！\n(最終更新: ${dateStr})\n\n最新の状態に同期しますか？\n\n※「OK」を押すと、現在の端末データはクラウドの内容で上書きされます。`)) {
                    // データ適用
                    // ID順にソートして保存
                    cloudData.sort((a, b) => (a.id > b.id ? -1 : 1));
                    localStorage.setItem('dx_sites', JSON.stringify(cloudData));
                    
                    alert("✅ 最新データを取り込みました！");
                    location.reload(); // 画面をリフレッシュ
                }
            }
        }
    } catch (e) {
        console.log("更新チェックスキップ(オフライン等):", e);
    }
}