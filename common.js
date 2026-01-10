// ★設定：ここにGASのURLを貼れば全ページに適用されます！
const CONFIG = {
    GAS_API_URL: "https://script.google.com/macros/s/AKfycbxxDC7Ak1PVF1sWYmDJlnLDokqndsNugtp1koaZgWZg51ihzksYe9hKJ4y_sTqVjUfp/exec", // ←ここにURLを入れる
    BACKUP_WARN_DAYS: 3 // 何日バックアップしなかったら警告するか
};

// --- 共通ユーティリティ ---

// 通知を表示
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

// モーダル操作と「戻るボタン」対策
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    if (!modal || !overlay) return;

    if (show) {
        modal.classList.add('show');
        overlay.classList.add('show');
        // ブラウザ履歴に追加（戻るボタンで閉じれるようにする）
        history.pushState({ modalId: modalId }, null, "");
    } else {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        // 履歴があれば戻る（二重に戻らないようチェックが必要だが簡易的に）
        if (history.state && history.state.modalId === modalId) {
            history.back();
        }
    }
}

// 戻るボタンが押された時の処理
window.onpopstate = function(event) {
    // 開いているモーダルがあれば閉じる
    document.querySelectorAll('.modal-box.show').forEach(el => {
        el.classList.remove('show');
    });
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.remove('show');
};

// バックアップ警告（データ保存時に日時を記録し、起動時にチェック）
function checkBackupStatus() {
    const lastBackup = localStorage.getItem('dx_last_backup');
    if (!lastBackup) return; // 初回はスルー

    const days = (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
    if (days > CONFIG.BACKUP_WARN_DAYS) {
        setTimeout(() => {
            showNotification(`⚠️ バックアップから${Math.floor(days)}日経過しています`);
        }, 2000);
    }
}

// データを保存した時に呼ぶ関数
function touchBackupTime() {
    localStorage.setItem('dx_last_backup', Date.now());
}

// GASへのデータ同期（安全版：取得して比較はせず、まずは上書き防止の警告付き送信）
// ※本当はサーバーと比較すべきだが、まずは「送る」機能の共通化
async function uploadDataToCloud(data, type = "sync") {
    if(!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.includes("xxxx")) {
        alert("設定からGAS URLを登録してください");
        return false;
    }
    
    try {
        showNotification("☁️ クラウドに送信中...");
        const res = await fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, data: data, reporter: localStorage.getItem('dx_reporter_name') || "職人" })
        });
        showNotification("✅ 送信完了");
        touchBackupTime(); // バックアップ時刻更新
        return true;
    } catch(e) {
        alert("送信エラー: " + e);
        return false;
    }
}