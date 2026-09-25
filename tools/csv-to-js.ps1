# 用法：powershell -ExecutionPolicy Bypass -File tools\csv-to-js.ps1
# 讀 tools\裝備清單-850種.csv，產生 data\config-gear-catalog.js（改完 CSV 後重新執行即可）
param([string]$Csv = (Join-Path $PSScriptRoot '裝備清單-850種.csv'), [string]$Out = (Join-Path $PSScriptRoot '..\data\config-gear-catalog.js'))
$ErrorActionPreference = 'Stop'
$chanKey = @{ '可製作・凡俗宗門'='craft1'; '可製作・修真宗門'='craft2'; '可製作・至高宗門'='craft3'; '外界・奪寶'='loot'; '外界・拍賣'='auction'; '外界・秘境'='realm' }
$rows = Import-Csv $Csv -Encoding UTF8
$slotOrder = @('劍','刀','扇','弓','笛','筆','頭','內衣','盔甲','手套','長靴','披風','腰帶','項鍊','戒指','耳環','腰牌')
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('// 裝備圖鑑：17 部位 × 50 種 = 850 種（ARCHITECTURE.md 第 37 節）')
[void]$sb.AppendLine('// ⚠️ 本檔由 tools\csv-to-js.ps1 從 tools\裝備清單-850種.csv 自動產生，請改 CSV 再重新執行，不要直接改這裡。每列：[名稱, 五行, 取得管道, 四維模板, 特效, 套裝]')
[void]$sb.AppendLine('//   取得管道：craft1/craft2/craft3 = 凡俗／修真／至高宗門可製作；loot = 奪寶；auction = 拍賣；realm = 秘境')
[void]$sb.AppendLine('//   id = 「部位-兩位數序號」（例 劍-07），存檔記的是 id，**已上線後不可重排、不可刪列**，改名只改名稱欄即可')
[void]$sb.AppendLine('const gearCatalog = {')
foreach ($slot in $slotOrder) {
    $list = @($rows | Where-Object { $_.'部位' -eq $slot } | Sort-Object { [int]($_.'編號'.Split('-')[1]) })
    if ($list.Count -ne 50) { throw "$slot 有 $($list.Count) 列" }
    [void]$sb.AppendLine("    `"$slot`": [")
    for ($i = 0; $i -lt $list.Count; $i++) {
        $r = $list[$i]
        $set = ($r.'套裝' -replace '（.*$', '')
        $ch = $chanKey[$r.'取得管道']
        if (-not $ch) { throw "未知管道：$($r.'取得管道')" }
        $comma = if ($i -lt $list.Count - 1) { ',' } else { '' }
        [void]$sb.AppendLine(("        [`"{0}`", `"{1}`", `"{2}`", `"{3}`", `"{4}`", `"{5}`"]{6}" -f $r.'名稱', $r.'五行', $ch, $r.'四維模板', $r.'特效', $set, $comma))
    }
    $c2 = if ($slot -ne $slotOrder[-1]) { ',' } else { '' }
    [void]$sb.AppendLine("    ]$c2")
}
[void]$sb.AppendLine('};')
[IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object Text.UTF8Encoding $false))
"寫入 $Out"
