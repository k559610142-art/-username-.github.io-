// 藏書閣彈窗：消耗武學積分參悟古籍，永久提升四維（每項上限 100 次，可 ×1 / ×10 / 最高 批次參悟）

const STUDY_COST = 10;        // 每次消耗的武學積分
const STUDY_GAIN = 20;        // 每次提升的屬性
const STUDY_MAX_COUNT = 100;  // 每本古籍參悟上限

function openLibraryModal() {
    if (!checkSectJoined()) return;
    document.getElementById('library-modal').style.display = 'flex';
}

// qty：1、10 或 'max'
function studyBook(statType, qty = 1) {
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
    let remaining = STUDY_MAX_COUNT - player.studyCounts[statType];
    if (remaining <= 0) {
        alert(`該古籍已達參悟上限 (${STUDY_MAX_COUNT} 次)，無法繼續參悟！`);
        return;
    }

    let affordable = Math.min(Math.floor(player.martialPoints / STUDY_COST), remaining);
    if (affordable <= 0) {
        alert(`武學積分不足 ${STUDY_COST} 點！可前往演武學宮完成【整理武學秘典】任務獲得。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "參悟");
    if (!n) return;

    player.martialPoints -= STUDY_COST * n;
    player.studyCounts[statType] += n;
    player.stats[statType] += STUDY_GAIN * n;
    addDailyProgress('study', n);

    let names = { str: '力量', con: '體質', int: '悟性', spr: '靈力' };
    addLog(`📚 在藏書閣研讀秘典 ${n} 次 (${player.studyCounts[statType]}/${STUDY_MAX_COUNT})，【${names[statType]}】永久提升 ${STUDY_GAIN * n} 點！`, "skill");
    updateUI();
}
