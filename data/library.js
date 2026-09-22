// 藏書閣彈窗：消耗武學積分參悟古籍，永久提升四維（每項上限 100 次）

function openLibraryModal() {
    if (!checkSectJoined()) return;
    document.getElementById('library-modal').style.display = 'flex';
}

function studyBook(statType) {
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
    if (player.studyCounts[statType] >= 100) {
        alert("該古籍已達參悟上限 (100 次)，無法繼續參悟！");
        return;
    }

    if (player.martialPoints < 10) {
        alert("武學積分不足 10 點！可前往演武學宮完成【整理武學秘典】任務獲得。");
        return;
    }

    player.martialPoints -= 10;
    player.studyCounts[statType]++;
    player.stats[statType] += 20;
    addDailyProgress('study');

    let names = { str: '力量', con: '體質', int: '悟性', spr: '靈力' };
    addLog(`📚 在藏書閣研讀秘典 (${player.studyCounts[statType]}/100)，【${names[statType]}】永久提升 20 點！`, "skill");
    updateUI();
}
