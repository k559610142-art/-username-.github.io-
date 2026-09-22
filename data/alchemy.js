// 煉丹房彈窗：消耗高階靈草煉製神丹，永久提升單項屬性

function openAlchemyModal() {
    if (!checkSectJoined()) return;
    document.getElementById('alchemy-modal').style.display = 'flex';
}

function craftPill(type) {
    if (type === 'str') {
        if (player.herbs.mortal < 1) { alert("凡品靈草不足 1 株！"); return; }
        player.herbs.mortal--;
        player.stats.str += 10;
        addLog("🧪 服用【大力神丸】，力量 +10！", "heal");
    } else if (type === 'con') {
        if (player.herbs.high < 1) { alert("上品靈草不足 1 株！"); return; }
        player.herbs.high--;
        player.stats.con += 25;
        addLog("🧪 服用【洗髓丹】，體質 +25！", "heal");
    } else if (type === 'int') {
        if (player.herbs.epic < 1) { alert("極品靈草不足 1 株！"); return; }
        player.herbs.epic--;
        player.stats.int += 50;
        addLog("🧪 服用【悟道丹】，悟性 +50！", "heal");
    } else if (type === 'spr') {
        if (player.herbs.immortal < 1) { alert("仙品靈草不足 1 株！"); return; }
        player.herbs.immortal--;
        player.stats.spr += 100;
        addLog("🧪 服用【九轉聚靈丹】，靈力 +100！", "heal");
    } else if (type === 'cha') {
        if (player.herbs.immortal < 1 || player.coins < 1000) { alert("需要 1 株仙品靈草與 1000 靈石！"); return; }
        player.herbs.immortal--;
        player.coins -= 1000;
        player.stats.cha += 20;
        addLog("🧪 服用【駐顏駐魅力丹】，魅力 +20！", "heal");
    }
    addDailyProgress('craft');
    updateUI();
}
