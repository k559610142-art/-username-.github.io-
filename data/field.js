// 宗門靈田彈窗：消耗靈草+靈石瞬間培育高階靈草

function openFieldModal() {
    if (!checkSectJoined()) return;
    document.getElementById('field-modal').style.display = 'flex';
}

function plantHerb(type) {
    let reqGrass = 0, reqCoins = 0;
    if (type === 'mortal') { reqGrass = 10; reqCoins = 5; }
    if (type === 'high') { reqGrass = 50; reqCoins = 10; }
    if (type === 'epic') { reqGrass = 200; reqCoins = 20; }
    if (type === 'immortal') { reqGrass = 500; reqCoins = 50; }

    if (player.spiritGrass >= reqGrass && player.coins >= reqCoins) {
        player.spiritGrass -= reqGrass;
        player.coins -= reqCoins;
        player.herbs[type]++;
        let names = {mortal: '凡品', high: '上品', epic: '極品', immortal: '仙品'};
        addLog(`🌾 消耗資源，在靈田成功培育並收穫了 1 株【${names[type]}靈草】！`, "system");
        updateUI();
    } else {
        alert("資源不足！請確認靈草與靈石數量。");
    }
}
